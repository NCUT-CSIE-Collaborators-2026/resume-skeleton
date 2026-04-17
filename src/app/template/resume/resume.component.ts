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
    educationGroupName: string;
    expTitle: string;
    experienceGroupName: string;
    stackTitle: string;
    projectsTitle: string;
    verifyTitle: string;
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
  'card-ui': {
    addLabel: string;
    addItemLabel: string;
    addCollectionLabel: string;
    newCollectionName: string;
    newItemValue: string;
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
    groups: Array<{
      name: string;
      icon: string;
      items: Array<{ value: string; icon: string }>;
    }>;
  };
  verify: {
    items: string[];
  };
  card_content?: Record<
    string,
    {
      subtitle?: string;
      elements?: Card['elements'];
    }
  >;
}

type ResumeLocale = I18nLocale & ContentLocale;

interface UiCopy {
  introTitle: string;
  educationTitle: string;
  educationGroupName: string;
  expTitle: string;
  experienceGroupName: string;
  stackTitle: string;
  projectTitle: string;
  verifyTitle: string;
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

interface CardUi {
  addLabel: string;
  addItemLabel: string;
  addCollectionLabel: string;
  newCollectionName: string;
  newItemValue: string;
}

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
    groups: [],
  },
  verify: {
    items: [],
  },
  card_content: {},
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

  readonly uiCopy = computed<UiCopy>(() => {
    const content = this.content();
    return {
      introTitle: content['content-ui'].introTitle,
      educationTitle: content['content-ui'].educationTitle,
      educationGroupName: content['content-ui'].educationGroupName,
      expTitle: content['content-ui'].expTitle,
      experienceGroupName: content['content-ui'].experienceGroupName,
      stackTitle: content['content-ui'].stackTitle,
      projectTitle: content['content-ui'].projectsTitle,
      verifyTitle: content['content-ui'].verifyTitle,
      labels: content['content-ui'].labels,
    };
  });

  readonly projectItems = computed(() => this.content().projects.items);
  readonly projectGroups = computed(() => {
    const groups = this.content().projects.groups;
    if (groups.length > 0) {
      return groups;
    }

    return [
      {
        name: this.uiCopy().projectTitle,
        icon: 'pi pi-folder-open',
        items: this.projectItems().map((item) => ({
          value: item,
          icon: 'pi pi-check-circle',
        })),
      },
    ];
  });
  readonly verifyItems = computed(() => this.content().verify.items);

  readonly barUi = computed<BarUi>(() => {
    const content = this.content();
    return {
      exportPdfLabel: content['bar-ui'].exportPdfLabel,
      exportingLabel: content['bar-ui'].exportingLabel,
    };
  });

  readonly cardUi = computed<CardUi>(() => {
    const content = this.content();
    return {
      addLabel: content['card-ui'].addLabel,
      addItemLabel: content['card-ui'].addItemLabel,
      addCollectionLabel: content['card-ui'].addCollectionLabel,
      newCollectionName: content['card-ui'].newCollectionName,
      newItemValue: content['card-ui'].newItemValue,
    };
  });

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
      name: this.uiCopy().experienceGroupName,
      icon: 'pi pi-briefcase',
      items: [
        {
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
    const baseCards: Card[] = [
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
            type: 'grid-tree',
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
            type: 'grid-tree',
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
            type: 'grid-tree',
            groups: this.projectGroups(),
            gridLayout: 'single',
          },
        ],
      },
      // 證照卡
      {
        id: 'verify',
        title: ui.verifyTitle,
        layout: 12,
        elements: [
          {
            type: 'icon-list',
            icon: 'pi pi-check-circle',
            items: this.verifyItems(),
          },
        ],
      },
    ];

    return baseCards.map((card) => this.applyStoredCardContent(card));
  });

  private getStoredCardContent(cardId: string):
    | {
        subtitle?: string;
        elements?: Card['elements'];
      }
    | null {
    const cardContent = this.content().card_content;
    if (!cardContent) {
      return null;
    }

    let key = cardId;
    if (cardId === 'intro') {
      const modeKey = `intro_${this.introMode()}`;
      const alternateModeKey = this.introMode() === '30' ? 'intro_60' : 'intro_30';
      key = modeKey;

      const fallbackKey = [modeKey, 'intro', 'introductions', alternateModeKey].find(
        (candidate) => this.isRecord(cardContent[candidate]),
      );
      if (fallbackKey) {
        key = fallbackKey;
      }
    }

    const stored = cardContent[key];
    return stored ?? null;
  }

  private applyStoredCardContent(card: Card): Card {
    const stored = this.getStoredCardContent(card.id);
    if (!stored) {
      return card;
    }

    const nextCard: Card = { ...card };
    if (typeof stored.subtitle === 'string') {
      nextCard.subtitle = stored.subtitle;
    }

    if (Array.isArray(stored.elements)) {
      const normalizedElements = this.normalizeLegacyElementTypes(
        this.deepClone(stored.elements as Card['elements']),
      );

      nextCard.elements =
        card.id === 'projects'
          ? this.normalizeProjectCardElements(normalizedElements)
          : normalizedElements;
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
      const response = await fetch(this.contentApiUrl);
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
    const source = this.isRecord(raw) ? raw : {};

    const profile = this.isRecord(source['profile']) ? source['profile'] : {};
    const education = this.isRecord(source['education']) ? source['education'] : {};
    const experience = this.isRecord(source['experience']) ? source['experience'] : {};
    const techStack = this.isRecord(source['tech_stack']) ? source['tech_stack'] : {};
    const introductions = this.isRecord(source['introductions']) ? source['introductions'] : {};
    const projects = this.isRecord(source['projects']) ? source['projects'] : {};
    const verify = this.isRecord(source['verify']) ? source['verify'] : {};
    const cardContent = this.isRecord(source['card_content']) ? source['card_content'] : {};
    const rootName = this.readNonEmptyString(source['name']);
    const rootTitle = this.readNonEmptyString(source['title']) ?? this.readNonEmptyString(source['tittle']);

    const normalizedProfile = {
      ...EMPTY_CONTENT_LOCALE.profile,
      ...profile,
    };

    if (!normalizedProfile.name && rootName) {
      normalizedProfile.name = rootName;
    }

    if (!normalizedProfile.title && rootTitle) {
      normalizedProfile.title = rootTitle;
    }

    return {
      profile: normalizedProfile,
      education: {
        ...EMPTY_CONTENT_LOCALE.education,
        ...education,
      },
      experience: {
        ...EMPTY_CONTENT_LOCALE.experience,
        ...experience,
      },
      tech_stack: {
        ...EMPTY_CONTENT_LOCALE.tech_stack,
        ...techStack,
        language: this.normalizeStringArray(techStack['language'], EMPTY_CONTENT_LOCALE.tech_stack.language),
        frontend: this.normalizeStringArray(techStack['frontend'], EMPTY_CONTENT_LOCALE.tech_stack.frontend),
        backend: this.normalizeStringArray(techStack['backend'], EMPTY_CONTENT_LOCALE.tech_stack.backend),
        database: this.normalizeStringArray(techStack['database'], EMPTY_CONTENT_LOCALE.tech_stack.database),
        devops: this.normalizeStringArray(techStack['devops'], EMPTY_CONTENT_LOCALE.tech_stack.devops),
      },
      introductions: {
        ...EMPTY_CONTENT_LOCALE.introductions,
        ...this.normalizeIntroductions(introductions, cardContent),
      },
      projects: {
        ...EMPTY_CONTENT_LOCALE.projects,
        ...projects,
        items: this.normalizeStringArray(projects['items'], EMPTY_CONTENT_LOCALE.projects.items),
        groups: this.normalizeTreeGroups(projects['groups']),
      },
      verify: {
        ...EMPTY_CONTENT_LOCALE.verify,
        ...verify,
        items: this.normalizeStringArray(verify['items'], EMPTY_CONTENT_LOCALE.verify.items),
      },
      card_content: cardContent,
    };
  }

  private normalizeIntroductions(
    introductions: Record<string, any>,
    cardContent: Record<string, any>,
  ): ContentLocale['introductions'] {
    const normalized = {
      ...EMPTY_CONTENT_LOCALE.introductions,
      ...introductions,
    };

    const fallback30 =
      this.readIntroTextFromCardContent(cardContent, 'intro_30') ??
      this.readIntroTextFromCardContent(cardContent, 'intro') ??
      this.readIntroTextFromCardContent(cardContent, 'introductions');

    const fallback60 =
      this.readIntroTextFromCardContent(cardContent, 'intro_60') ?? fallback30;

    if (!normalized.pitch_30s?.trim() && fallback30) {
      normalized.pitch_30s = fallback30;
    }

    if (!normalized.pitch_1min?.trim() && fallback60) {
      normalized.pitch_1min = fallback60;
    }

    return normalized;
  }

  private normalizeTreeGroups(value: unknown): Array<{
    name: string;
    icon: string;
    items: Array<{ value: string; icon: string }>;
  }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((group) => {
        if (!this.isRecord(group)) {
          return null;
        }

        const name = this.readNonEmptyString(group['name']) ?? '';
        const icon = this.readNonEmptyString(group['icon']) ?? 'pi pi-folder-open';
        const rawItems = Array.isArray(group['items']) ? group['items'] : [];
        const items = rawItems
          .map((item) => {
            if (!this.isRecord(item)) {
              return null;
            }

            const itemValue = this.readNonEmptyString(item['value']) ?? '';
            const itemIcon = this.readNonEmptyString(item['icon']) ?? 'pi pi-check-circle';

            return {
              value: itemValue,
              icon: itemIcon,
            };
          })
          .filter((item): item is { value: string; icon: string } => item !== null);

        return {
          name,
          icon,
          items,
        };
      })
      .filter(
        (group): group is { name: string; icon: string; items: Array<{ value: string; icon: string }> } =>
          group !== null,
      );
  }

  private readIntroTextFromCardContent(
    cardContent: Record<string, any>,
    key: string,
  ): string | null {
    const entry = cardContent[key];
    if (!this.isRecord(entry)) {
      return null;
    }

    if (typeof entry['text'] === 'string' && entry['text'].trim()) {
      return entry['text'];
    }

    const elements = entry['elements'];
    if (!Array.isArray(elements)) {
      return null;
    }

    const textElement = elements.find((element) => {
      if (!this.isRecord(element)) {
        return false;
      }

      return element['type'] === 'text' && typeof element['text'] === 'string' && element['text'].trim();
    }) as Record<string, any> | undefined;

    return textElement?.['text'] ?? null;
  }

  private isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
      return [...fallback];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private readNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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

  private normalizeLegacyElementTypes(elements: unknown[]): Card['elements'] {
    return elements.map((element) => {
      const candidate = element as { type?: string; children?: unknown[] };

      if (candidate.type === 'grid-education' || candidate.type === 'grid-groups') {
        return {
          ...(element as object),
          type: 'grid-tree',
        } as Card['elements'][number];
      }

      if (Array.isArray(candidate.children) && candidate.children.length > 0) {
        return {
          ...(element as object),
          children: this.normalizeLegacyElementTypes(candidate.children),
        } as Card['elements'][number];
      }

      return element as Card['elements'][number];
    }) as Card['elements'];
  }

  private normalizeProjectCardElements(elements: Card['elements']): Card['elements'] {
    const topLevelProjectGroups = this.projectGroups();

    return elements.map((element) => {
      if (element.type === 'grid-tree') {
        return {
          ...element,
          groups: element.groups,
          gridLayout: element.gridLayout ?? 'single',
        };
      }

      if (element.type !== 'icon-list') {
        return element;
      }

      // D1 正規資料來源以 projects.groups 為主；
      // card_content.projects 若仍是舊 icon-list，優先回退到 top-level groups。
      if (topLevelProjectGroups.length > 0) {
        return {
          type: 'grid-tree',
          groups: this.deepClone(topLevelProjectGroups),
          gridLayout: 'single',
        };
      }

      return {
        type: 'grid-tree',
        groups: [
          {
            name: this.uiCopy().projectTitle,
            icon: 'pi pi-folder-open',
            items: element.items.map((item) => ({
              value: item,
              icon: element.icon || 'pi pi-check-circle',
            })),
          },
        ],
        gridLayout: 'single',
      };
    });
  }

  private createDefaultTreeCollection(): { name: string; icon: string; items: Array<{ value: string; icon: string }> } {
    return {
      name: '',
      icon: 'pi pi-folder',
      items: [this.createDefaultTreeGroupItem(1)],
    };
  }

  private createDefaultTreeGroupItem(_nextIndex: number): { value: string; icon: string } {
    return {
      value: '',
      icon: 'pi pi-circle',
    };
  }

  private createDefaultBadgeValue(): string {
    return '';
  }

  private createDefaultIconListValue(): string {
    return '';
  }

  private createDefaultTechCategory(): {
    label: string;
    value: string[];
    severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary';
  } {
    return {
      label: this.cardUi().newCollectionName,
      value: [],
      severity: 'info',
    };
  }

  private updateDraftCard(cardId: string, updater: (draft: Card) => Card): void {
    const draft = this.cardDrafts()[cardId];
    if (!draft) {
      return;
    }

    const nextDraft = updater(this.deepClone(draft));
    this.cardDrafts.update((drafts) => ({ ...drafts, [cardId]: nextDraft }));
  }

  updateTextElement(cardId: string, elementIndex: number, value: string): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'text') {
        return draft;
      }

      element.text = value;
      return draft;
    });
  }

  updateBadgeItem(
    cardId: string,
    elementIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'badges') {
        return draft;
      }

      element.items[itemIndex] = value;
      return draft;
    });
  }

  updateIconListItem(
    cardId: string,
    elementIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'icon-list') {
        return draft;
      }

      element.items[itemIndex] = value;
      return draft;
    });
  }

  updateTechCategoryValues(
    cardId: string,
    elementIndex: number,
    categoryIndex: number,
    value: string,
  ): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'grid-tech') {
        return draft;
      }

      element.items[categoryIndex].value = value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return draft;
    });
  }

  updateTreeGroupItemValue(
    cardId: string,
    elementIndex: number,
    treeGroupIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'grid-tree') {
        return draft;
      }

      element.groups[treeGroupIndex].items[itemIndex].value = value;
      return draft;
    });
  }

  updateTreeGroupItemIcon(
    cardId: string,
    elementIndex: number,
    treeGroupIndex: number,
    itemIndex: number,
    icon: string,
  ): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'grid-tree') {
        return draft;
      }

      element.groups[treeGroupIndex].items[itemIndex].icon = icon;
      return draft;
    });
  }

  updateTreeGroupName(
    cardId: string,
    elementIndex: number,
    treeGroupIndex: number,
    value: string,
  ): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'grid-tree') {
        return draft;
      }

      element.groups[treeGroupIndex].name = value;
      return draft;
    });
  }

  updateTreeGroupIcon(
    cardId: string,
    elementIndex: number,
    treeGroupIndex: number,
    icon: string,
  ): void {
    this.updateDraftCard(cardId, (draft) => {
      const element = draft.elements[elementIndex];
      if (element?.type !== 'grid-tree') {
        return draft;
      }

      element.groups[treeGroupIndex].icon = icon;
      return draft;
    });
  }

  addCardItem(cardId: string, path: number[]): void {
    this.updateDraftCard(cardId, (draft) => {
      const elementIndex = path[0];
      const element = draft.elements[elementIndex];

      if (!element) {
        return draft;
      }

      if (path.length !== 1 && element.type !== 'grid-tree') {
        return draft;
      }

      if (element.type === 'badges' && path.length === 1) {
        element.items.push(this.createDefaultBadgeValue());
        return draft;
      }

      if (element.type === 'icon-list' && path.length === 1) {
        element.items.push(this.createDefaultIconListValue());
        return draft;
      }

      if (element.type === 'grid-tech' && path.length === 1) {
        element.items.push(this.createDefaultTechCategory());
        return draft;
      }

      if (element.type === 'text') {
        return draft;
      }

      if (element.type === 'grid-tree' && path.length === 1) {
        element.groups.push(this.createDefaultTreeCollection());
        return draft;
      }

      if (element.type === 'grid-tree' && path.length === 2) {
        const treeGroupIndex = path[1];
        const targetGroup = element.groups[treeGroupIndex];
        if (!targetGroup) {
          return draft;
        }

        targetGroup.items.push(this.createDefaultTreeGroupItem(targetGroup.items.length + 1));
        return draft;
      }
      return draft;
    });
  }

  deleteCardItem(
    cardId: string,
    elementIndex: number,
    itemIndex?: number,
    treeGroupIndex?: number,
    categoryIndex?: number,
    deleteTreeGroup?: boolean,
  ): void {
    this.pendingDeleteItemKeys.update((pendingDeletes) => {
      const next = new Set(pendingDeletes[cardId] ?? []);
      next.add(
        this.getPendingDeleteItemKey(
          elementIndex,
          itemIndex,
          treeGroupIndex,
          categoryIndex,
          deleteTreeGroup,
        ),
      );

      return {
        ...pendingDeletes,
        [cardId]: next,
      };
    });
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

      if (element.type === 'grid-tech') {
        return {
          ...element,
          items: element.items.filter((_, categoryIndex) => {
            return !pendingDeletes.has(
              this.getPendingDeleteItemKey(elementIndex, categoryIndex, undefined, categoryIndex),
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

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const source = this.resumeCanvas.nativeElement;
      // 暫時儲存 A4 模式狀態
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
          // 新增 PDF 模式 CSS 類別，處理所有樣式移除
          const clonedCanvas = clonedDocument.querySelector('.resume-canvas');
          if (clonedCanvas instanceof HTMLElement) {
            clonedCanvas.classList.add('resume-canvas--pdf');
            clonedCanvas.classList.add('pdf-export-mode');
            clonedCanvas.style.setProperty('opacity', '1', 'important');
            clonedCanvas.style.setProperty('filter', 'none', 'important');
          }

          // 強制移除動畫，避免 html2canvas 截到 reveal 淡入中的狀態。
          clonedCanvas?.querySelectorAll<HTMLElement>('*').forEach((element) => {
            element.style.setProperty('animation', 'none', 'important');
            element.style.setProperty('transition', 'none', 'important');
            element.style.setProperty('opacity', '1', 'important');
            element.style.setProperty('filter', 'none', 'important');
          });

          // 直接在 clone 階段覆寫卡片與標籤色彩，避免元件封裝造成 PDF selector 漏命中。
          clonedCanvas?.querySelectorAll<HTMLElement>('.card').forEach((card) => {
            card.style.setProperty('background', '#ffffff', 'important');
            card.style.setProperty('background-image', 'none', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
            card.style.setProperty('border-color', 'rgba(148, 163, 184, 0.15)', 'important');
          });

          clonedCanvas?.querySelectorAll<HTMLElement>('.badge, .chip, .tag').forEach((item) => {
            item.style.setProperty('background-color', '#f3f4f6', 'important');
            item.style.setProperty('color', '#374151', 'important');
            item.style.setProperty('border-color', '#d1d5db', 'important');
          });

          clonedCanvas?.querySelectorAll<HTMLElement>('.stack-item').forEach((item) => {
            item.style.setProperty('background', '#f9fafb', 'important');
            item.style.setProperty('border-color', 'rgba(148, 163, 184, 0.15)', 'important');
          });

          // 明確隱藏 action-panel 元素
          const actionPanels = clonedCanvas?.querySelectorAll('[class*="action-panel"]');
          actionPanels?.forEach((panel) => {
            if (panel instanceof HTMLElement) {
              panel.style.display = 'none !important';
            }
          });

          // 相容新版卡片元件：匯出時隱藏編輯按鈕與按鈕群組
          const cardActionControls = clonedCanvas?.querySelectorAll(
            '.card-button-group, .card-edit-btn, .card-cancel-btn',
          );
          cardActionControls?.forEach((control) => {
            if (control instanceof HTMLElement) {
              control.style.setProperty('display', 'none', 'important');
            }
          });

          // 隱藏 top-bar 右側工具與行動 action panel（包含 editor chip）。
          const topBarControls = clonedCanvas?.querySelectorAll(
            '.desktop-toolbar, .action-panel, .action-panel--mobile, .editor-chip, .editor-menu, .lang-btn, .a4-btn, .download-btn',
          );
          topBarControls?.forEach((control) => {
            if (control instanceof HTMLElement) {
              control.style.setProperty('display', 'none', 'important');
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
        name: this.uiCopy().educationGroupName,
        icon: 'pi pi-building-columns',
        items: [
          {
            value: education.school,
            icon: 'pi pi-building-columns',
          },
          {
            value: education.department,
            icon: 'pi pi-book',
          },
          {
            value: `${education.degree} | ${education.graduation_status}`,
            icon: 'pi pi-graduation-cap',
          },
        ],
      },
    ];
  }
}
