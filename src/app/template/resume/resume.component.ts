import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GroupListComponent } from '../../uikit/group-list.component';
import { TopBarComponent } from './top-bar/top-bar.component';
import i18nData from '../../ui.i18n.json';
import { environment } from '../../config/environment';
import { AuthSessionService } from '../../services/auth-session.service';

type LangCode = 'en' | 'zh_TW';

interface I18nLocale {
  config: {
    code: 'en' | 'zh_TW';
    label: string;
    lang: string;
    title: string;
  };
  'content-ui': {
    introTitle: string;
    educationTitle: string;
    expTitle: string;
    stackTitle: string;
    projectsTitle: string;
    labels: {
      language: string;
      frontend: string;
      backend: string;
      database: string;
      devops: string;
    };
  };
  'bar-ui': {
    exportPdfLabel: string;
    exportingLabel: string;
  };
}

interface ContentLocale {
  profile: {
    name: string;
    title: string;
    gender: string;
    age: string;
    status: string;
    mbti: string;
  };
  education: {
    school: string;
    department: string;
    degree: string;
    graduation_status: string;
  };
  experience: {
    intern_title: string;
    assistant_title: string;
    military_title: string;
  };
  tech_stack: {
    language: string[];
    frontend: string[];
    backend: string[];
    database: string[];
    devops: string[];
  };
  introductions: {
    pitch_30s: string;
    pitch_1min: string;
  };
  projects: {
    items: string[];
  };
}

type ResumeLocale = I18nLocale & ContentLocale;

interface UiCopy {
  introTitle: string;
  educationTitle: string;
  expTitle: string;
  stackTitle: string;
  projectTitle: string;
  labels: {
    language: string;
    frontend: string;
    backend: string;
    database: string;
    devops: string;
  };
}

interface BarUi {
  exportPdfLabel: string;
  exportingLabel: string;
}

type CardElement =
  | { type: 'text'; text: string }
  | { type: 'badges'; items: string[] }
  | { type: 'icon-list'; icon: string; items: string[] }
  | {
      type: 'grid-tech';
      items: Array<{
        label: string;
        value: string[];
        severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary';
      }>;
      gridLayout?: 'compact' | 'single';
    }
  | {
      type: 'grid-education';
      groups: Array<{
        name: string;
        items: Array<{ label: string; value: string; icon: string }>;
      }>;
      gridLayout?: 'compact' | 'single';
    }
  | {
      type: 'grid-groups';
      groups: Array<{
        name: string;
        items: Array<{ label: string; value: string; icon: string }>;
      }>;
      gridLayout?: 'compact' | 'single';
    };

interface Card {
  id: string;
  title: string;
  subtitle?: string;
  layout: number;
  elements: CardElement[];
}

const UI_I18N = i18nData as Record<LangCode, I18nLocale>;

const EMPTY_CONTENT_LOCALE: ContentLocale = {
  profile: {
    name: '',
    title: '',
    gender: '',
    age: '',
    status: '',
    mbti: '',
  },
  education: {
    school: '',
    department: '',
    degree: '',
    graduation_status: '',
  },
  experience: {
    intern_title: '',
    assistant_title: '',
    military_title: '',
  },
  tech_stack: {
    language: [],
    frontend: [],
    backend: [],
    database: [],
    devops: [],
  },
  introductions: {
    pitch_30s: '',
    pitch_1min: '',
  },
  projects: {
    items: [],
  },
};

@Component({
  selector: 'resume',
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    ToastModule,
    GroupListComponent,
    TopBarComponent,
  ],
  providers: [MessageService],
  templateUrl: './resume.component.html',
  styleUrl: './resume.component.scss',
})
export class ResumeComponent {
  @ViewChild('resumeCanvas') resumeCanvas?: ElementRef<HTMLElement>;

  readonly activeLang = signal<LangCode>(this.getInitialLanguage());
  readonly introMode = signal<'30' | '60'>(this.getIntroModeFromHash());
  readonly isExporting = signal(false);
  readonly isA4Mode = signal(this.getPaperModeFromLocalStorage());
  readonly isContentLoading = signal(true);
  readonly contentError = signal<string | null>(null);
  readonly editorUser = computed(() => {
    const user = this.authSessionService.user();
    if (!user || !user.name) {
      return null;
    }

    return {
      name: user.name,
      picture: user.picture ?? null,
    };
  });
  readonly isAuthenticated = computed(() => this.authSessionService.isAuthenticated());

  readonly editingCardIds = signal<Set<string>>(new Set());
  readonly savingCardIds = signal<Set<string>>(new Set());
  readonly cardDrafts = signal<Record<string, Card>>({});

  private readonly contentApiUrl = `${environment.apiUrl}${environment.apiEndpoints.contentI18n}`;
  private readonly sessionApiUrl = `${environment.apiUrl}${environment.apiEndpoints.authSession}`;
  private readonly logoutApiUrl = `${environment.apiUrl}/api/resume/auth/logout`;
  private readonly contentCardUpdateApiUrl = `${environment.apiUrl}${environment.apiEndpoints.contentCardUpdate}`;
  private readonly contentByLang = signal<Record<LangCode, ContentLocale>>({
    en: { ...EMPTY_CONTENT_LOCALE },
    zh_TW: { ...EMPTY_CONTENT_LOCALE },
  });

  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly messageService: MessageService,
  ) {
    void this.loadContentFromApi();
    void this.authSessionService.loadSession(this.sessionApiUrl);

    // 同步文件語言屬性
    effect(() => {
      const lang = this.content().config.lang;
      document.documentElement.lang = lang;
    });

    // 同步文件標題
    effect(() => {
      const title = this.content().config.title;
      document.title = title;
    });

    // 保存 A4 模式狀態到 localStorage
    effect(() => {
      const isA4 = this.isA4Mode();
      this.savePaperModeToLocalStorage(isA4);
    });
  }

  readonly languageOptions = computed(() =>
    Object.entries(UI_I18N).map(([code, locale]) => ({
      label: locale.config.label,
      code: code as LangCode,
    })),
  );

  readonly content = computed<ResumeLocale>(() => ({
    ...UI_I18N[this.activeLang()],
    ...this.contentByLang()[this.activeLang()],
  }));

  readonly uiCopy = computed<UiCopy>(() => {
    const content = this.content();
    return {
      introTitle: content['content-ui'].introTitle,
      educationTitle: content['content-ui'].educationTitle,
      expTitle: content['content-ui'].expTitle,
      stackTitle: content['content-ui'].stackTitle,
      projectTitle: content['content-ui'].projectsTitle,
      labels: content['content-ui'].labels,
    };
  });

  readonly projectItems = computed(() => this.content().projects.items);

  readonly barUi = computed<BarUi>(() => {
    const content = this.content();
    return {
      exportPdfLabel: content['bar-ui'].exportPdfLabel,
      exportingLabel: content['bar-ui'].exportingLabel,
    };
  });

  readonly profileInfo = computed(() => {
    const content = this.content();
    return {
      name: content.profile.name,
      title: content.profile.title,
    };
  });

  readonly profileBadges = computed(() => [
    this.content().profile.gender,
    this.content().profile.age,
    this.content().profile.mbti,
  ]);

  readonly experiences = computed(() => [
    this.content().experience.intern_title,
    this.content().experience.assistant_title,
    this.content().experience.military_title,
  ]);

  // 經驗資料轉換為groups格式（3個GROUP，各有1筆資料）
  readonly experienceGroups = computed(() => {
    const exps = this.experiences();
    return exps.map((exp) => ({
      name: 'Experience',
      items: [
        {
          label: 'experience',
          value: exp,
          icon: 'pi pi-briefcase',
        },
      ],
    }));
  });

  readonly introText = computed(() =>
    this.introMode() === '30'
      ? this.content().introductions.pitch_30s
      : this.content().introductions.pitch_1min,
  );

  // 技術堆疊卡片的動態寬度：根據項目數量自動調整
  readonly stackCardLayout = computed(() => {
    const stackItems = this.getTechStackData();
    if (stackItems.length > 6) return 8; // 超過6項，用8列
    if (stackItems.length > 4) return 6; // 5-6項，用6列
    return 4; // 4項以下，用4列
  });

  readonly cards = computed<Card[]>(() => {
    const content = this.content();
    const ui = this.uiCopy();

    return [
      // 個人資料卡
      {
        id: 'profile',
        title: 'Profile',
        subtitle: content.profile.status,
        layout: 4,
        elements: [{ type: 'badges', items: this.profileBadges() }],
      },
      // 介紹卡
      {
        id: 'intro',
        title: ui.introTitle,
        layout: 6,
        elements: [{ type: 'text', text: this.introText() }],
      },
      // 教育卡
      {
        id: 'education',
        title: ui.educationTitle,
        layout: 6,
        elements: [
          {
            type: 'grid-education',
            groups: this.getEducationData(),
            gridLayout: 'compact',
          },
        ],
      },
      // 經驗卡
      {
        id: 'experience',
        title: ui.expTitle,
        layout: 4,
        elements: [
          {
            type: 'grid-groups',
            groups: this.experienceGroups(),
            gridLayout: 'compact',
          },
        ],
      },
      // 技術堆疊卡
      {
        id: 'stack',
        title: ui.stackTitle,
        layout: this.stackCardLayout(),
        elements: [
          {
            type: 'grid-tech',
            items: this.getTechStackData(),
            gridLayout: 'compact',
          },
        ],
      },
      // 專案卡
      {
        id: 'projects',
        title: ui.projectTitle,
        layout: 12,
        elements: [
          {
            type: 'icon-list',
            icon: 'pi pi-check-circle',
            items: this.projectItems(),
          },
        ],
      },
    ];
  });

  // 自動填滿列的計算
  readonly cardsWithAutoFill = computed<Card[]>(() => {
    const baseCards = this.cards();
    const adjusted: Card[] = [];
    let rowSpan = 0;
    let rowStartIndex = 0;

    for (let i = 0; i < baseCards.length; i++) {
      const card = { ...baseCards[i] };
      const nextRowSpan = rowSpan + card.layout;

      if (i === 0) {
        adjusted.push(card);
        rowSpan = card.layout;
        rowStartIndex = 0;
      } else if (nextRowSpan <= 12) {
        adjusted.push(card);
        rowSpan = nextRowSpan;
      } else {
        // 調整當前行的最後一張卡片來填滿12列
        if (rowSpan < 12 && adjusted.length > rowStartIndex) {
          adjusted[adjusted.length - 1] = {
            ...adjusted[adjusted.length - 1],
            layout: adjusted[adjusted.length - 1].layout + (12 - rowSpan),
          };
        }
        // 開始新的一行
        adjusted.push(card);
        rowSpan = card.layout;
        rowStartIndex = adjusted.length - 1;
      }
    }

    // 處理最後一行
    if (rowSpan < 12 && adjusted.length > 0) {
      adjusted[adjusted.length - 1] = {
        ...adjusted[adjusted.length - 1],
        layout: adjusted[adjusted.length - 1].layout + (12 - rowSpan),
      };
    }

    return adjusted;
  });

  readonly renderedCards = computed<Card[]>(() => {
    const drafts = this.cardDrafts();
    return this.cardsWithAutoFill().map((card) => drafts[card.id] ?? card);
  });

  private async loadContentFromApi(): Promise<void> {
    this.isContentLoading.set(true);
    this.contentError.set(null);

    try {
      const response = await fetch(this.contentApiUrl);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as Partial<
        Record<LangCode, ContentLocale>
      >;

      if (!data.en || !data.zh_TW) {
        throw new Error('Incomplete i18n payload from backend');
      }

      this.contentByLang.set({
        en: data.en,
        zh_TW: data.zh_TW,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown loading error';
      this.contentError.set(message);
    } finally {
      this.isContentLoading.set(false);
    }
  }

  isCardEditing(cardId: string): boolean {
    return this.editingCardIds().has(cardId);
  }

  isCardSaving(cardId: string): boolean {
    return this.savingCardIds().has(cardId);
  }

  async onCardEditAction(card: Card): Promise<void> {
    if (this.isCardSaving(card.id)) {
      return;
    }

    if (!this.isCardEditing(card.id)) {
      this.startCardEditing(card);
      return;
    }

    await this.saveCard(card.id);
  }

  onCardCancelEdit(cardId: string): void {
    this.editingCardIds.update((ids) => {
      const next = new Set(ids);
      next.delete(cardId);
      return next;
    });
    this.cardDrafts.update((drafts) => {
      const { [cardId]: _removed, ...rest } = drafts;
      return rest;
    });
  }

  private startCardEditing(card: Card): void {
    const cloned = this.deepClone(card);
    this.cardDrafts.update((drafts) => ({ ...drafts, [card.id]: cloned }));
    this.editingCardIds.update((ids) => {
      const next = new Set(ids);
      next.add(card.id);
      return next;
    });
  }

  private async saveCard(cardId: string): Promise<void> {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    this.savingCardIds.update((ids) => {
      const next = new Set(ids);
      next.add(cardId);
      return next;
    });

    try {
      const result = await this.persistCardUpdate(draft);
      if (!result.ok) {
        this.messageService.add({
          severity: 'error',
          summary: '儲存失敗',
          detail: result.message,
        });
        return;
      }

      this.messageService.add({
        severity: 'success',
        summary: '儲存成功',
        detail: result.message,
      });

      this.editingCardIds.update((ids) => {
        const next = new Set(ids);
        next.delete(cardId);
        return next;
      });
      this.cardDrafts.update((drafts) => {
        const { [cardId]: _removed, ...rest } = drafts;
        return rest;
      });

      await this.loadContentFromApi();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: '儲存失敗',
        detail: '更新卡片時發生未預期錯誤。',
      });
    } finally {
      this.savingCardIds.update((ids) => {
        const next = new Set(ids);
        next.delete(cardId);
        return next;
      });
    }
  }

  private async persistCardUpdate(
    card: Card,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch(this.contentCardUpdateApiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang: this.activeLang(),
          introMode: this.introMode(),
          card,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        return {
          ok: false,
          message: payload.message ?? `更新失敗（HTTP ${response.status}）`,
        };
      }

      return {
        ok: true,
        message: payload.message ?? `「${card.title}」已更新。`,
      };
    } catch {
      return {
        ok: false,
        message: '無法連線更新內容，請稍後再試。',
      };
    }
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  updateTextElement(cardId: string, elementIndex: number, value: string): void {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    const element = draft.elements[elementIndex];
    if (element?.type !== 'text') {
      return;
    }

    element.text = value;
    this.cardDrafts.update((drafts) => ({ ...drafts, [cardId]: draft }));
  }

  updateBadgeItem(
    cardId: string,
    elementIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    const element = draft.elements[elementIndex];
    if (element?.type !== 'badges') {
      return;
    }

    element.items[itemIndex] = value;
    this.cardDrafts.update((drafts) => ({ ...drafts, [cardId]: draft }));
  }

  updateIconListItem(
    cardId: string,
    elementIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    const element = draft.elements[elementIndex];
    if (element?.type !== 'icon-list') {
      return;
    }

    element.items[itemIndex] = value;
    this.cardDrafts.update((drafts) => ({ ...drafts, [cardId]: draft }));
  }

  updateTechCategoryValues(
    cardId: string,
    elementIndex: number,
    categoryIndex: number,
    value: string,
  ): void {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    const element = draft.elements[elementIndex];
    if (element?.type !== 'grid-tech') {
      return;
    }

    element.items[categoryIndex].value = value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    this.cardDrafts.update((drafts) => ({ ...drafts, [cardId]: draft }));
  }

  getTechCategoryValueText(values: string[]): string {
    return values.join(', ');
  }

  updateGroupItemValue(
    cardId: string,
    elementIndex: number,
    groupIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    const element = draft.elements[elementIndex];
    if (element?.type !== 'grid-education' && element?.type !== 'grid-groups') {
      return;
    }

    element.groups[groupIndex].items[itemIndex].value = value;
    this.cardDrafts.update((drafts) => ({ ...drafts, [cardId]: draft }));
  }

  setLanguage(lang: string | LangCode): void {
    if (lang === 'en' || lang === 'zh_TW') {
      this.editingCardIds.set(new Set());
      this.savingCardIds.set(new Set());
      this.cardDrafts.set({});
      this.activeLang.set(lang);
      this.saveLanguageToLocalStorage(lang);
    }
  }

  setPaperMode(isA4: boolean): void {
    this.isA4Mode.set(isA4);
    this.savePaperModeToLocalStorage(isA4);
  }

  async onLogout(): Promise<void> {
    try {
      const response = await fetch(this.logoutApiUrl, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        this.messageService.add({
          severity: 'success',
          summary: '登出成功',
          detail: '已清除編輯狀態',
        });
        
        // 重新加载session以清除编辑用户
        await this.authSessionService.loadSession(this.sessionApiUrl);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: '登出失敗',
          detail: '無法完成登出',
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: '登出失敗',
        detail: '登出過程出現錯誤',
      });
    }
  }

  private getInitialLanguage(): LangCode {
    if (typeof window === 'undefined') {
      return 'en';
    }

    const saved = localStorage.getItem('resume-language');
    if (saved === 'en' || saved === 'zh_TW') {
      return saved as LangCode;
    }

    return 'en';
  }

  private saveLanguageToLocalStorage(lang: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resume-language', lang);
    }
  }

  private savePaperModeToLocalStorage(isA4: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resume-a4-mode', isA4 ? 'true' : 'false');
    }
  }

  private getPaperModeFromLocalStorage(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const saved = localStorage.getItem('resume-a4-mode');
    return saved === 'true';
  }

  async exportResumePdf(): Promise<void> {
    if (this.isExporting()) {
      return;
    }

    if (!this.resumeCanvas?.nativeElement || typeof window === 'undefined') {
      return;
    }

    this.isExporting.set(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const source = this.resumeCanvas.nativeElement;
      // 臨時保存 A4 模式狀態
      const wasA4Mode = this.isA4Mode();

      // 強制啟用 A4 模式
      this.isA4Mode.set(true);

      // 等待 DOM 更新
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(source, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 2,
        logging: false,
        onclone: (clonedDocument: Document) => {
          // 添加 PDF 模式 CSS 類，處理所有樣式移除
          const clonedCanvas = clonedDocument.querySelector('.resume-canvas');
          if (clonedCanvas instanceof HTMLElement) {
            clonedCanvas.classList.add('resume-canvas--pdf');
            clonedCanvas.classList.add('pdf-export-mode');
          }

          // 明確隱藏 action-panel 元素
          const actionPanels = clonedCanvas?.querySelectorAll('[class*="action-panel"]');
          actionPanels?.forEach((panel) => {
            if (panel instanceof HTMLElement) {
              panel.style.display = 'none !important';
            }
          });

          // 備用：移除 ambient 背景裝飾元素
          clonedCanvas?.querySelectorAll('.ambient').forEach((ambient) => {
            ambient.parentNode?.removeChild(ambient);
          });
        },
      });

      // 恢復 A4 模式狀態
      this.isA4Mode.set(wasA4Mode);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageData = canvas.toDataURL('image/png');

      const topMargin = 5;
      const maxWidth = pageWidth - 10;
      const maxHeight = pageHeight - 10;

      const canvasAspect = canvas.height / canvas.width;

      let imgWidth = maxWidth;
      let imgHeight = maxWidth * canvasAspect;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = maxHeight / canvasAspect;
      }

      const leftMargin = (pageWidth - imgWidth) / 2;

      pdf.addImage(
        imageData,
        'PNG',
        leftMargin,
        topMargin,
        imgWidth,
        imgHeight,
      );
      pdf.save(`Resume_Haolun_Wang_${this.activeLang()}.pdf`);
    } finally {
      this.isExporting.set(false);
    }
  }

  @HostListener('window:hashchange')
  onHashChange(): void {
    this.introMode.set(this.getIntroModeFromHash());
  }

  private getIntroModeFromHash(): '30' | '60' {
    if (typeof window !== 'undefined' && window.location.hash === '#30') {
      return '30';
    }

    return '60';
  }

  // 技術堆疊資料驅動
  getTechStackData() {
    const stack = this.content().tech_stack;
    const labels = this.uiCopy().labels;

    return [
      {
        label: labels.language,
        value: stack.language,
        severity: 'info' as const,
      },
      {
        label: labels.frontend,
        value: stack.frontend,
        severity: 'success' as const,
      },
      {
        label: labels.backend,
        value: stack.backend,
        severity: 'warning' as const,
      },
      {
        label: labels.database,
        value: stack.database,
        severity: 'danger' as const,
      },
      {
        label: labels.devops,
        value: stack.devops,
        severity: 'secondary' as const,
      },
    ];
  }

  // 教育資料驅動
  getEducationData() {
    const education = this.content().education;

    return [
      {
        name: 'Education Info',
        items: [
          {
            label: 'school',
            value: education.school,
            icon: 'pi pi-building-columns',
          },
          {
            label: 'department',
            value: education.department,
            icon: 'pi pi-book',
          },
          {
            label: 'degree',
            value: `${education.degree} | ${education.graduation_status}`,
            icon: 'pi pi-graduation-cap',
          },
        ],
      },
    ];
  }
}
