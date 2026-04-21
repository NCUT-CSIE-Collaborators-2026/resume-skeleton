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
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TopBarComponent } from './top-bar/top-bar.component';
import { ResumeCardComponent } from './resume-card/resume-card.component';
import { Card } from './resume.model';
import { ResumeContentNormalizer } from './resume-content-normalizer';
import { CardContentEntry, TreeListItem } from './resume-content.types';
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
  'topbar-ui': {
    editorMenuLabel: string;
    loginLabel: string;
    logoutLabel: string;
    modeA4Label: string;
    modeRwdLabel: string;
    exportPdfLabel: string;
    exportingLabel: string;
  };
}

interface ContentLocale {
  card_content?: {
    cards: CardContentEntry[];
    [key: string]: unknown;
  };
}

type ResumeLocale = I18nLocale & ContentLocale;

interface TopBarUi {
  editorMenuLabel: string;
  loginLabel: string;
  logoutLabel: string;
  modeA4Label: string;
  modeRwdLabel: string;
  exportPdfLabel: string;
  exportingLabel: string;
}

const UI_I18N = i18nData as Record<LangCode, I18nLocale>;

const EMPTY_CONTENT_LOCALE: ContentLocale = {
  card_content: {
    cards: [],
  },
};

@Component({
  selector: 'resume',
  imports: [
    CommonModule,
    ToastModule,
    TopBarComponent,
    ResumeCardComponent,
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
  readonly cardRenderVersions = signal<Record<string, number>>({});
  readonly pendingDeleteItemKeys = signal<Record<string, Set<string>>>({});

  private readonly apiBasePath = environment.apiBasePath;
  private readonly contentApiUrl = `${environment.apiUrl}${this.apiBasePath}${environment.apiEndpoints.contentI18n}`;
  private readonly sessionApiUrl = `${environment.apiUrl}${this.apiBasePath}${environment.apiEndpoints.authSession}`;
  private readonly logoutApiUrl = `${environment.apiUrl}${this.apiBasePath}${environment.apiEndpoints.authLogout}`;
  private readonly contentCardUpdateApiUrl = `${environment.apiUrl}${this.apiBasePath}${environment.apiEndpoints.contentCardUpdate}`;
  private readonly contentByLang = signal<Record<LangCode, ContentLocale>>({
    en: { ...EMPTY_CONTENT_LOCALE },
    zh_TW: { ...EMPTY_CONTENT_LOCALE },
  });
  private readonly contentNormalizer = new ResumeContentNormalizer(
    () => this.introMode(),
  );

  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly messageService: MessageService,
  ) {
    void this.loadContentFromApi();
    void this.authSessionService.loadSession(this.sessionApiUrl, {
      retries: 3,
      retryDelayMs: 350,
    });

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

    // 儲存 A4 模式狀態到 localStorage
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

  readonly cardContentById = computed(() => this.indexCardContentEntries(this.content().card_content?.cards ?? []));

  readonly topBarUi = computed<TopBarUi>(() => {
    const content = this.content();
    return {
      editorMenuLabel: content['topbar-ui'].editorMenuLabel,
      loginLabel: content['topbar-ui'].loginLabel,
      logoutLabel: content['topbar-ui'].logoutLabel,
      modeA4Label: content['topbar-ui'].modeA4Label,
      modeRwdLabel: content['topbar-ui'].modeRwdLabel,
      exportPdfLabel: content['topbar-ui'].exportPdfLabel,
      exportingLabel: content['topbar-ui'].exportingLabel,
    };
  });



  readonly profileInfo = computed(() => {
    const cardEntries = this.content().card_content?.cards ?? [];
    
    // 查找 headline 和 profile 卡片
    const headline = cardEntries.find((entry) => entry.type === 'headline');
    const profileCard = cardEntries.find((entry) => entry.id === 'profile');
    
    // 优先使用 headline 的 title，否则使用 profile 卡片
    return {
      name: headline?.title || profileCard?.name || 'Profile',
      title: headline?.subtitle || profileCard?.title || 'Profile',
    };
  });

  readonly cards = computed<Card[]>(() => {
    const cardEntries = this.content().card_content?.cards ?? [];

    // 过滤掉 headline 类型的卡片，只返回真实卡片
    return cardEntries
      .filter((entry) => entry.type !== 'headline')
      .map((entry, index) => this.buildCardFromEntry(entry, index));
  });

  private getStoredCardContent(cardId: string):
    | {
        title?: string;
        subtitle?: string;
        elements?: Card['elements'];
        topics?: string[];
      }
    | null {
    const cardContent = this.content().card_content;
    if (!cardContent) {
      return null;
    }

    const cards = Array.isArray(cardContent.cards) ? cardContent.cards : [];
    const storedFromArray = cards.find((entry) => entry?.id === cardId);
    return storedFromArray ?? null;
  }

  private applyStoredCardContent(card: Card): Card {
    const stored = this.getStoredCardContent(card.id);
    if (!stored) {
      return card;
    }

    const nextCard: Card = { ...card };
    if (typeof stored.title === 'string' && stored.title.trim().length > 0) {
      nextCard.title = stored.title;
    }

    if (typeof stored.subtitle === 'string') {
      nextCard.subtitle = stored.subtitle;
    }

    if (Array.isArray(stored.elements)) {
      nextCard.elements = this.contentNormalizer.sanitizeCardElements(
        this.deepClone(stored.elements as Card['elements']),
      );
    }

    return nextCard;
  }

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
    return this.cards().map((card) => drafts[card.id] ?? card);
  });

  private async loadContentFromApi(): Promise<void> {
    this.isContentLoading.set(true);
    this.contentError.set(null);

    try {
      const url = new URL(this.contentApiUrl, window.location.origin);
      url.searchParams.set('_ts', Date.now().toString());

      const response = await fetch(url.toString(), {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as Partial<Record<LangCode, unknown>>;

      if (!data.en || !data.zh_TW) {
        throw new Error('Incomplete i18n payload from backend');
      }

      this.contentByLang.set({
        en: this.normalizeContentLocale(data.en),
        zh_TW: this.normalizeContentLocale(data.zh_TW),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown loading error';
      this.contentError.set(message);
    } finally {
      this.isContentLoading.set(false);
    }
  }

  private normalizeContentLocale(raw: unknown): ContentLocale {
    return this.contentNormalizer.normalizeContentLocale(raw, EMPTY_CONTENT_LOCALE) as ContentLocale;
  }

  isCardEditing(cardId: string): boolean {
    return this.editingCardIds().has(cardId);
  }

  isCardSaving(cardId: string): boolean {
    return this.savingCardIds().has(cardId);
  }

  getPendingDeleteItemKeys(cardId: string): Set<string> | null {
    return this.pendingDeleteItemKeys()[cardId] ?? null;
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
    this.clearPendingDeleteItemKeys(cardId);

    // 強制重建已取消編輯的卡片元件，以重置暫時性的介面狀態。
    this.cardRenderVersions.update((versions) => ({
      ...versions,
      [cardId]: (versions[cardId] ?? 0) + 1,
    }));
  }

  /**
   * 統一的元素變更處理
   * 接收完整的更新元素，直接替換到卡片草稿中
   */
  onElementChange(element: any): void {
    if (!element || !element.cardId) {
      console.warn('Element change received without cardId');
      return;
    }

    const cardId = element.cardId;
    const elementIndex = element.elementIndex;

    if (elementIndex === undefined) {
      console.warn('Element change received without elementIndex');
      return;
    }

    this.updateDraftCard(cardId, (draft) => {
      // Replace the entire element in the draft
      if (draft.elements[elementIndex]) {
        draft.elements[elementIndex] = element;
      }
      return draft;
    });
  }

  getCardTrackKey(cardId: string): string {
    const version = this.cardRenderVersions()[cardId] ?? 0;
    return `${cardId}:${version}`;
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

  private async saveCard(cardId: string, keepEditing = false): Promise<void> {
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
      const sanitizedDraft = this.applyPendingDeleteItemKeys(cardId, draft);
      const result = await this.persistCardUpdate(sanitizedDraft);
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

      this.cardDrafts.update((drafts) => ({
        ...drafts,
        [cardId]: sanitizedDraft,
      }));
      this.clearPendingDeleteItemKeys(cardId);

      if (!keepEditing) {
        this.editingCardIds.update((ids) => {
          const next = new Set(ids);
          next.delete(cardId);
          return next;
        });
      }
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
  
  private updateDraftCard(cardId: string, updater: (draft: Card) => Card): void {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    const nextDraft = updater(this.deepClone(draft));
    this.cardDrafts.update((drafts) => ({ ...drafts, [cardId]: nextDraft }));
  }


  isCardItemPendingDelete(
    cardId: string,
    elementIndex: number,
    itemIndex: number,
    treeGroupIndex?: number,
    categoryIndex?: number,
  ): boolean {
    return (
      this.pendingDeleteItemKeys()[cardId]?.has(
        this.getPendingDeleteItemKey(elementIndex, itemIndex, treeGroupIndex, categoryIndex),
      ) ?? false
    );
  }

  setLanguage(lang: string | LangCode): void {
    if (lang === 'en' || lang === 'zh_TW') {
      this.editingCardIds.set(new Set());
      this.savingCardIds.set(new Set());
      this.cardDrafts.set({});
      this.pendingDeleteItemKeys.set({});
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
        
        // 重新載入 session 以清除編輯中的使用者狀態
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

  private clearPendingDeleteItemKeys(cardId: string): void {
    this.pendingDeleteItemKeys.update((pendingDeletes) => {
      if (!pendingDeletes[cardId]) {
        return pendingDeletes;
      }

      const { [cardId]: _removed, ...rest } = pendingDeletes;
      return rest;
    });
  }

  private getPendingDeleteItemKey(
    elementIndex: number,
    itemIndex?: number,
    treeGroupIndex?: number,
    categoryIndex?: number,
    deleteTreeGroup?: boolean,
  ): string {
    if (deleteTreeGroup && typeof treeGroupIndex === 'number') {
      return `${elementIndex}:group:${treeGroupIndex}:delete`;
    }

    if (typeof categoryIndex === 'number') {
      return `${elementIndex}:category:${categoryIndex}`;
    }

    if (typeof treeGroupIndex === 'number' && typeof itemIndex === 'number') {
      return `${elementIndex}:group:${treeGroupIndex}:${itemIndex}`;
    }

    if (typeof itemIndex === 'number') {
      return `${elementIndex}:item:${itemIndex}`;
    }

    return `${elementIndex}:unknown`;
  }

  private applyPendingDeleteItemKeys(cardId: string, draft: Card): Card {
    const pendingDeletes = this.pendingDeleteItemKeys()[cardId];
    if (!pendingDeletes || pendingDeletes.size === 0) {
      return draft;
    }

    const nextDraft = this.deepClone(draft);
    nextDraft.elements = nextDraft.elements.map((element, elementIndex) => {
      if (element.type === 'badges' || element.type === 'icon-list') {
        return {
          ...element,
          items: element.items.filter((_, itemIndex) => {
            return !pendingDeletes.has(
              this.getPendingDeleteItemKey(elementIndex, itemIndex),
            );
          }),
        };
      }

      if (element.type === 'grid-tree') {
        return {
          ...element,
          groups: element.groups.filter((_, treeGroupIndex) => {
            // Check if the entire group is marked for deletion
            if (pendingDeletes.has(
              this.getPendingDeleteItemKey(elementIndex, undefined, treeGroupIndex, undefined, true),
            )) {
              return false;
            }
            return true;
          }).map((group, treeGroupIndex) => ({
            ...group,
            items: group.items.filter((_, itemIndex) => {
              return !pendingDeletes.has(
                this.getPendingDeleteItemKey(elementIndex, itemIndex, treeGroupIndex),
              );
            }),
          })),
        };
      }

      return element;
    });

    return nextDraft;
  }

  async exportResumePdf(): Promise<void> {
    if (this.isExporting()) {
      return;
    }

    if (!this.resumeCanvas?.nativeElement || typeof window === 'undefined') {
      return;
    }

    this.isExporting.set(true);

    // 儲存導出前的原始狀態
    const wasA4Mode = this.isA4Mode();
    const source = this.resumeCanvas.nativeElement;
    const shell = source.closest('.resume-shell') as HTMLElement;

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // 强制啟用 A4 模式以便克隆時能看到 A4 樣式
      this.isA4Mode.set(true);
      if (shell) {
        shell.classList.add('a4-mode');
      }

      // 等待 DOM 更新和樣式應用
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 克隆源元素以避免修改原始 DOM
      const clonedSource = source.cloneNode(true) as HTMLElement;

      // 隱藏克隆中的控制元素
      const controlsToHide = clonedSource.querySelectorAll<HTMLElement>(
        '.desktop-toolbar, .action-panel, .action-panel--mobile, .editor-chip, .editor-menu, .lang-btn, .a4-btn, .download-btn',
      );
      controlsToHide.forEach((control) => {
        control.style.display = 'none';
      });

      // 添加 PDF 模式樣式類
      clonedSource.classList.add('resume-canvas--pdf');

      // 只移除所有元素的動畫和過渡，不干涉布局
      clonedSource.querySelectorAll<HTMLElement>('*').forEach((element) => {
        element.style.setProperty('animation', 'none', 'important');
        element.style.setProperty('transition', 'none', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('filter', 'none', 'important');
      });

      // 計算正確的內容尺寸
      // A4 = 210mm × 297mm, margin = 5mm, 內容區 = 200mm × 287mm
      // 需要轉換成像素值讓 html2canvas 捕捉時與 PDF 內容區大小一致
      const mmToPixel = 96 / 25.4; // 96 DPI，標準瀏覽器 DPI
      const pdfMarginMm = 5;
      const a4WidthMm = 210;
      const a4HeightMm = 297;
      const contentWidthMm = a4WidthMm - 2 * pdfMarginMm; // 200mm
      const contentHeightMm = a4HeightMm - 2 * pdfMarginMm; // 287mm
      const windowWidthPx = Math.round(contentWidthMm * mmToPixel); // ≈ 756px
      const singlePageHeightPx = Math.round(contentHeightMm * mmToPixel); // ≈ 1085px

      // 臨時插入 DOM 以測量在 A4 寬度下的實際高度（允許多頁）
      const offscreenContainer = document.createElement('div');
      offscreenContainer.style.position = 'absolute';
      offscreenContainer.style.left = '-9999px';
      offscreenContainer.style.top = '-9999px';
      offscreenContainer.style.width = `${windowWidthPx}px`;
      offscreenContainer.style.visibility = 'hidden';
      offscreenContainer.appendChild(clonedSource);
      document.body.appendChild(offscreenContainer);

      // 取得實際的內容高度（這會反映多頁的完整內容）
      const actualHeight = clonedSource.offsetHeight || clonedSource.scrollHeight;

      // html2pdf 會在 HTML 級別進行分頁，使用 page-break-inside 規則防止切割
      const options = {
        margin: 5,
        filename: `Resume_Haolun_Wang_${this.activeLang()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff',
          windowWidth: windowWidthPx,
          windowHeight: actualHeight, // 使用實際測量的高度，允許多頁
          ignoreElements: (element: HTMLElement) => {
            // 隱藏不需要的元素
            const classList = element.className || '';
            return classList.includes('desktop-toolbar') || 
                   classList.includes('action-panel') ||
                   classList.includes('editor-chip') ||
                   classList.includes('lang-btn') ||
                   classList.includes('a4-btn') ||
                   classList.includes('download-btn');
          },
        },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        pagebreak: { mode: ['avoid-all'] },
      };

      await html2pdf().set(options).from(clonedSource).save();

      // 清理：從 DOM 移除臨時容器
      document.body.removeChild(offscreenContainer);
    } finally {
      // 立即恢復原始狀態，無論成功或失敗
      this.isA4Mode.set(wasA4Mode);
      if (shell) {
        if (wasA4Mode) {
          shell.classList.add('a4-mode');
        } else {
          shell.classList.remove('a4-mode');
        }
      }
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
  private indexCardContentEntries(entries: CardContentEntry[]): Record<string, CardContentEntry> {
    return entries.reduce<Record<string, CardContentEntry>>((index, entry) => {
      index[entry.id] = entry;
      return index;
    }, {});
  }

  private buildCardFromEntry(entry: CardContentEntry, index: number): Card {
    const elements = Array.isArray(entry.elements)
      ? this.contentNormalizer.sanitizeCardElements(this.deepClone(entry.elements))
      : [];
    const type = this.resolveCardType(entry, elements);
    const layout = this.resolveCardLayout(entry, index);

    return {
      id: entry.id,
      type,
      title: typeof entry.title === 'string' ? entry.title : '',
      subtitle: entry.subtitle,
      layout,
      elements,
    };
  }

  private resolveCardType(entry: CardContentEntry, elements: Card['elements']): string {
    const explicitType = typeof entry.type === 'string' && entry.type.trim().length > 0
      ? entry.type.trim()
      : null;

    if (explicitType) {
      return explicitType;
    }

    return elements[0]?.type ?? 'text';
  }

  private resolveCardLayout(entry: CardContentEntry, index: number): number {
    // 基於卡片 ID 或類型的布局規則，不再依賴元素類型
    const id = typeof entry.id === 'string' ? entry.id : '';
    
    // 特定卡片的 layout 規則
    if (id === 'profile') {
      return 4;
    }

    // 默認規則：第一張卡片（通常是 intro）用 4 列，其他 6 列
    return index === 0 ? 4 : 6;
  }
}
