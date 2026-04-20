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
    profileCardTitle: string;
    introCardTitle: string;
    educationCardTitle: string;
    educationGroupTitle: string;
    experienceCardTitle: string;
    experienceGroupTitle: string;
    stackCardTitle: string;
    projectsCardTitle: string;
    verifyCardTitle: string;
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

interface TreeListItem {
  value: string;
  icon: string;
  children?: TreeListItem[];
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
      items: TreeListItem[];
    }>;
  };
  verify: {
    items: string[];
  };
  card_content?: CardContentCollection;
}

interface CardContentEntry {
  id: string;
  title?: string;
  subtitle?: string;
  name?: string;
  headline?: string;
  text?: string;
  elements?: Card['elements'];
  topics?: string[];
}

interface CardContentCollection {
  cards: CardContentEntry[];
  [key: string]: unknown;
}

type ResumeLocale = I18nLocale & ContentLocale;

interface UiCopy {
  profileTitle: string;
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

  readonly uiCopy = computed<UiCopy>(() => {
    const content = this.content();
    return {
      profileTitle: content['content-ui'].profileCardTitle,
      introTitle: content['content-ui'].introCardTitle,
      educationTitle: content['content-ui'].educationCardTitle,
      educationGroupName: content['content-ui'].educationGroupTitle,
      expTitle: content['content-ui'].experienceCardTitle,
      experienceGroupName: content['content-ui'].experienceGroupTitle,
      stackTitle: content['content-ui'].stackCardTitle,
      projectTitle: content['content-ui'].projectsCardTitle,
      verifyTitle: content['content-ui'].verifyCardTitle,
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
  readonly verifyGroups = computed(() => {
    const items = this.verifyItems();
    if (items.length === 0) {
      return [];
    }

    return items.map((item, index) => {
      const parts = item
        .split('|')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

      const name = parts[0] ?? `Certification ${index + 1}`;
      const childItems = (parts.length > 1 ? parts.slice(1) : [item]).map((value) => ({
        value,
        icon: 'pi pi-check-circle',
      }));

      return {
        name,
        icon: 'pi pi-shield',
        items: childItems,
      };
    });
  });

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
      name: content.profile.name || 'Profile',
      title: content.profile.title || this.uiCopy().profileTitle,
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
    const stackItemsCount = stackItems.reduce((count, category) => count + category.value.length, 0);
    if (stackItemsCount > 8) return 8; // 超過8項，用8列
    if (stackItemsCount > 4) return 6; // 5-8項，用6列
    return 4; // 4項以下，用4列
  });

  readonly cards = computed<Card[]>(() => {
    const content = this.content();
    const ui = this.uiCopy();
    const baseCards: Card[] = [
      // 個人資料卡
      {
        id: 'profile',
        title: ui.profileTitle,
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
        layout: 2,
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
        layout: 2,
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
        layout: 6,
        elements: [
          {
            type: 'grid-tech',
            items: this.getTechStackData(),
            gridLayout: 'compact'
          },
        ],
      },
      // 專案卡
      {
        id: 'projects',
        title: ui.projectTitle,
        layout: 6,
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
        layout: 6,
        elements: [
          {
            type: 'grid-tree',
            groups: this.verifyGroups(),
            gridLayout: 'single',
          },
        ],
      },
    ];

    return baseCards.map((card) => this.applyStoredCardContent(card));
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

    const key = cardId === 'intro' ? `intro_${this.introMode()}` : cardId;
    const cards = Array.isArray(cardContent.cards) ? cardContent.cards : [];
    const storedFromArray = cards.find((entry) => entry?.id === key);
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

    if (card.id === 'stack') {
      return nextCard;
    }

    if (Array.isArray(stored.elements)) {
      nextCard.elements = this.sanitizeCardElements(
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
    const source = this.isRecord(raw) ? raw : {};
    const cardContent = this.isRecord(source['card_content']) ? source['card_content'] : {};
    const cardEntries = this.normalizeCardContentEntries(cardContent);

    const profileCard = this.getCardContentEntry(cardContent, cardEntries, 'profile');
    const educationCard = this.getCardContentEntry(cardContent, cardEntries, 'education');
    const experienceCard = this.getCardContentEntry(cardContent, cardEntries, 'experience');
    const techStackCard = this.getCardContentEntry(cardContent, cardEntries, 'stack');
    const intro30Card = this.getCardContentEntry(cardContent, cardEntries, 'intro_30');
    const intro60Card = this.getCardContentEntry(cardContent, cardEntries, 'intro_60');
    const projectsCard = this.getCardContentEntry(cardContent, cardEntries, 'projects');
    const verifyCard = this.getCardContentEntry(cardContent, cardEntries, 'verify');

    const profileBadgeValues = this.extractBadgeValues(profileCard);
    const educationGroups = this.extractTreeGroups(educationCard);
    const experienceGroups = this.extractTreeGroups(experienceCard);
    const techStackItems = this.extractTechStackItems(techStackCard);
    const projectsGroups = this.extractTreeGroups(projectsCard);
    const verifyItems = this.extractVerifyItems(verifyCard);

    return {
      profile: {
        ...EMPTY_CONTENT_LOCALE.profile,
        name:
          this.readNonEmptyString(profileCard['name']) ??
          this.readNonEmptyString(profileCard['displayName']) ??
          '',
        title:
          this.readNonEmptyString(profileCard['headline']) ??
          this.readNonEmptyString(profileCard['title']) ??
          '',
        gender: profileBadgeValues[0] ?? '',
        age: profileBadgeValues[1] ?? '',
        status: this.readNonEmptyString(profileCard['subtitle']) ?? '',
        mbti: profileBadgeValues[2] ?? '',
      },
      education: {
        ...EMPTY_CONTENT_LOCALE.education,
        school: this.readTreeGroupName(educationGroups, 0) ?? this.readTreeGroupItemValue(educationGroups, 0, 0) ?? '',
        department: this.readTreeGroupItemValue(educationGroups, 0, 0) ?? '',
        degree: this.readTreeGroupItemValue(educationGroups, 0, 1) ?? this.readTreeGroupItemValue(educationGroups, 0, 2, '|') ?? '',
        graduation_status:
          this.readTreeGroupItemValue(educationGroups, 0, 2) ??
          this.readTreeGroupItemValue(educationGroups, 0, 2, '|', 1) ??
          '',
      },
      experience: {
        ...EMPTY_CONTENT_LOCALE.experience,
        intern_title: this.readTreeGroupItemValue(experienceGroups, 0, 0) ?? '',
        assistant_title: this.readTreeGroupItemValue(experienceGroups, 1, 0) ?? '',
        military_title: this.readTreeGroupItemValue(experienceGroups, 2, 0) ?? '',
      },
      tech_stack: {
        ...EMPTY_CONTENT_LOCALE.tech_stack,
        language: this.normalizeStringArray(
          techStackItems.language,
          EMPTY_CONTENT_LOCALE.tech_stack.language,
        ),
        frontend: this.normalizeStringArray(
          techStackItems.frontend,
          EMPTY_CONTENT_LOCALE.tech_stack.frontend,
        ),
        backend: this.normalizeStringArray(
          techStackItems.backend,
          EMPTY_CONTENT_LOCALE.tech_stack.backend,
        ),
        database: this.normalizeStringArray(
          techStackItems.database,
          EMPTY_CONTENT_LOCALE.tech_stack.database,
        ),
        devops: this.normalizeStringArray(
          techStackItems.devops,
          EMPTY_CONTENT_LOCALE.tech_stack.devops,
        ),
      },
      introductions: {
        ...EMPTY_CONTENT_LOCALE.introductions,
        pitch_30s:
          this.readCardTextFromEntry(intro30Card) ??
          this.readCardTextFromEntry(intro60Card) ??
          '',
        pitch_1min:
          this.readCardTextFromEntry(intro60Card) ??
          this.readCardTextFromEntry(intro30Card) ??
          '',
      },
      projects: {
        ...EMPTY_CONTENT_LOCALE.projects,
        items: this.normalizeStringArray(this.extractFlatTreeItems(projectsGroups), EMPTY_CONTENT_LOCALE.projects.items),
        groups: this.normalizeTreeGroups(projectsGroups),
      },
      verify: {
        ...EMPTY_CONTENT_LOCALE.verify,
        items: this.normalizeStringArray(verifyItems, EMPTY_CONTENT_LOCALE.verify.items),
      },
      card_content: {
        ...cardContent,
        cards: cardEntries,
      },
    };
  }

  private normalizeCardContentEntries(raw: Record<string, unknown>): CardContentEntry[] {
    const cards = Array.isArray(raw['cards']) ? raw['cards'] : [];
    return cards
      .map((entry) => this.normalizeCardContentEntry(entry))
      .filter((entry): entry is CardContentEntry => entry !== null);
  }

  private normalizeCardContentEntry(raw: unknown): CardContentEntry | null {
    if (!this.isRecord(raw)) {
      return null;
    }

    const id = this.readNonEmptyString(raw['id']);
    if (!id) {
      return null;
    }

    const topics = Array.isArray(raw['topics'])
      ? raw['topics']
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];

    const normalizedElements = this.normalizeCardElements(raw['elements']);
    const resolvedElements =
      normalizedElements ??
      ((id === 'intro_30' || id === 'intro_60')
        ? ([{ type: 'text', text: '' }] as Card['elements'])
        : undefined);

    return {
      id,
      title: this.readNonEmptyString(raw['title']) ?? undefined,
      subtitle: this.readNonEmptyString(raw['subtitle']) ?? undefined,
      name: this.readNonEmptyString(raw['name']) ?? undefined,
      headline: this.readNonEmptyString(raw['headline']) ?? undefined,
      text: this.readNonEmptyString(raw['text']) ?? undefined,
      elements: resolvedElements,
      topics,
    };
  }

  private normalizeCardElements(value: unknown): Card['elements'] | undefined {
    if (Array.isArray(value)) {
      return this.sanitizeCardElements(this.deepClone(value as Card['elements']));
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith('[')) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? this.sanitizeCardElements(this.deepClone(parsed as Card['elements']))
        : undefined;
    } catch {
      return undefined;
    }
  }

  private sanitizeCardElements(elements: Card['elements']): Card['elements'] {
    return elements
      .map((element) => {
        if (!this.isRecord(element)) {
          return null;
        }

        const elementRecord = element as Record<string, unknown>;

        const type = this.readNonEmptyString(elementRecord['type']) ?? '';
        const nextElement: Record<string, unknown> = {
          ...elementRecord,
          type,
        };

        if (type === 'grid-tree') {
          nextElement['groups'] = this.normalizeTreeGroups(elementRecord['groups']);
        }

        if (type === 'grid-tech' && Array.isArray(elementRecord['items'])) {
          const rawItems = elementRecord['items'] as Array<Record<string, unknown>>;
          nextElement['items'] = rawItems
            .map((item) => {
              if (!this.isRecord(item)) {
                return null;
              }

              const values = this.normalizeStringArray(item['value'], []);
              if (values.length === 0) {
                return null;
              }

              return {
                label: this.readNonEmptyString(item['label']) ?? '',
                value: values,
                severity: this.readNonEmptyString(item['severity']) ?? 'secondary',
              };
            })
            .filter((item): item is { label: string; value: string[]; severity: string } => item !== null);
        }

        if (type === 'icon-list') {
          nextElement['items'] = this.normalizeStringArray(elementRecord['items'], []);
        }

        if (type === 'badges') {
          nextElement['items'] = this.normalizeStringArray(elementRecord['items'], []);
        }

        if (type === 'text') {
          nextElement['text'] = this.readNonEmptyString(elementRecord['text']) ?? '';
        }

        return nextElement;
      })
      .filter((element): element is Card['elements'][number] => element !== null);
  }

  private getCardContentEntry(
    _raw: Record<string, unknown>,
    entries: CardContentEntry[],
    cardId: string,
  ): Record<string, unknown> {
    const normalizedKey = cardId === 'intro' ? `intro_${this.introMode()}` : cardId;
    const arrayEntry = entries.find((entry) => entry.id === normalizedKey);
    return arrayEntry ? (arrayEntry as unknown as Record<string, unknown>) : {};
  }

  private extractBadgeValues(entry: Record<string, any>): string[] {
    const elements = Array.isArray(entry['elements']) ? entry['elements'] : [];
    const badgeElement = elements.find(
      (element) => this.isRecord(element) && element['type'] === 'badges',
    );

    if (!this.isRecord(badgeElement) || !Array.isArray(badgeElement['items'])) {
      return [];
    }

    return badgeElement['items']
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private extractTreeGroups(entry: Record<string, any>): Array<{
    name: string;
    icon: string;
    items: TreeListItem[];
  }> {
    const elements = Array.isArray(entry['elements']) ? entry['elements'] : [];
    const treeElement = elements.find(
      (element) => this.isRecord(element) && element['type'] === 'grid-tree',
    );

    if (!this.isRecord(treeElement) || !Array.isArray(treeElement['groups'])) {
      return [];
    }

    return this.normalizeTreeGroups(treeElement['groups']);
  }

  private extractVerifyItems(entry: Record<string, any>): string[] {
    const treeGroups = this.extractTreeGroups(entry);
    if (treeGroups.length > 0) {
      const fromTree = treeGroups.flatMap((group, index) => {
        const childValues = group.items
          .map((item) => item.value)
          .filter((value) => value.trim().length > 0);
        const parentName = group.name.trim().length > 0 ? group.name : `Certification ${index + 1}`;

        if (childValues.length === 0) {
          return [parentName];
        }

        return [`${parentName} | ${childValues.join(' | ')}`];
      });

      if (fromTree.length > 0) {
        return this.normalizeStringArray(fromTree, []);
      }
    }

    const elements = Array.isArray(entry['elements']) ? entry['elements'] : [];
    const iconListElement = elements.find(
      (element) => this.isRecord(element) && element['type'] === 'icon-list',
    );

    if (!this.isRecord(iconListElement) || !Array.isArray(iconListElement['items'])) {
      return [];
    }

    return iconListElement['items']
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private extractTechStackItems(entry: Record<string, any>): {
    language: string[];
    frontend: string[];
    backend: string[];
    database: string[];
    devops: string[];
  } {
    const fromTree = this.extractTechStackItemsFromTree(entry);
    if (Object.values(fromTree).some((values) => values.length > 0)) {
      return fromTree;
    }

    const elements = Array.isArray(entry['elements']) ? entry['elements'] : [];
    const techElement = elements.find(
      (element) => this.isRecord(element) && element['type'] === 'grid-tech',
    );

    if (!this.isRecord(techElement) || !Array.isArray(techElement['items'])) {
      return {
        language: [],
        frontend: [],
        backend: [],
        database: [],
        devops: [],
      };
    }

    const categories = {
      language: [] as string[],
      frontend: [] as string[],
      backend: [] as string[],
      database: [] as string[],
      devops: [] as string[],
    };

    const techItems = techElement['items'] as Array<Record<string, unknown>>;
    const keys = ['language', 'frontend', 'backend', 'database', 'devops'] as const;

    techItems.forEach((item, index) => {
      const key = keys[index];
      if (!key || !Array.isArray(item['value'])) {
        return;
      }

      categories[key] = this.normalizeStringArray(item['value'], []);
    });

    return categories;
  }

  private extractTechStackItemsFromTree(entry: Record<string, any>): {
    language: string[];
    frontend: string[];
    backend: string[];
    database: string[];
    devops: string[];
  } {
    const categories = {
      language: [] as string[],
      frontend: [] as string[],
      backend: [] as string[],
      database: [] as string[],
      devops: [] as string[],
    };

    const groups = this.extractTreeGroups(entry);
    if (groups.length === 0) {
      return categories;
    }

    groups.forEach((group) => {
      const key = this.resolveTechStackKey(group.name);
      if (!key) {
        return;
      }

      const values = group.items.map((item) => {
        const childText = Array.isArray(item.children) && item.children.length > 0
          ? ` ${item.children.map((child) => child.value).join(' ')}`
          : '';
        return `${item.value}${childText}`.trim();
      });

      categories[key] = this.normalizeStringArray(values, []);
    });

    return categories;
  }

  private resolveTechStackKey(groupName: string): 'language' | 'frontend' | 'backend' | 'database' | 'devops' | null {
    const normalized = groupName.trim().toLowerCase();
    const labels = this.uiCopy().labels;

    if (normalized === labels.language.trim().toLowerCase() || normalized === 'language' || normalized === '語言') {
      return 'language';
    }
    if (normalized === labels.frontend.trim().toLowerCase() || normalized === 'frontend' || normalized === '前端') {
      return 'frontend';
    }
    if (normalized === labels.backend.trim().toLowerCase() || normalized === 'backend' || normalized === '後端') {
      return 'backend';
    }
    if (normalized === labels.database.trim().toLowerCase() || normalized === 'database' || normalized === '資料庫') {
      return 'database';
    }
    if (normalized === labels.devops.trim().toLowerCase() || normalized === 'devops') {
      return 'devops';
    }

    return null;
  }

  private readCardTextFromEntry(entry: Record<string, any>): string | null {
    if (typeof entry['text'] === 'string' && entry['text'].trim().length > 0) {
      return entry['text'].trim();
    }

    const elements = Array.isArray(entry['elements']) ? entry['elements'] : [];
    const textElement = elements.find(
      (element) =>
        this.isRecord(element) &&
        element['type'] === 'text' &&
        typeof element['text'] === 'string' &&
        element['text'].trim().length > 0,
    ) as Record<string, any> | undefined;

    return textElement?.['text']?.trim?.() ?? null;
  }

  private readTreeGroupItemValue(
    groups: Array<{
      name: string;
      icon: string;
      items: TreeListItem[];
    }>,
    groupIndex: number,
    itemIndex: number,
    separator?: string,
    splitIndex = 0,
  ): string | null {
    const group = groups[groupIndex];
    const item = group?.items[itemIndex];
    if (!item?.value) {
      return null;
    }

    if (!separator) {
      return item.value;
    }

    const parts = item.value.split(separator).map((value) => value.trim());
    return parts[splitIndex] ?? null;
  }

  private readTreeGroupName(
    groups: Array<{
      name: string;
      icon: string;
      items: TreeListItem[];
    }>,
    groupIndex: number,
  ): string | null {
    const group = groups[groupIndex];
    return group?.name?.trim?.() || null;
  }

  private extractFlatTreeItems(
    groups: Array<{
      name: string;
      icon: string;
      items: TreeListItem[];
    }>,
  ): string[] {
    return groups.flatMap((group) => group.items.map((item) => item.value));
  }

  private normalizeTreeItems(value: unknown): TreeListItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const seenItemValues = new Set<string>();
    return value
      .map((item) => {
        if (!this.isRecord(item)) {
          return null;
        }

        const itemValue = this.readNonEmptyString(item['value']) ?? '';
        if (itemValue.length === 0 || seenItemValues.has(itemValue)) {
          return null;
        }

        seenItemValues.add(itemValue);
        const itemIcon = this.readNonEmptyString(item['icon']) ?? 'pi pi-check-circle';
        const children = this.normalizeTreeItems(item['children']);

        return {
          value: itemValue,
          icon: itemIcon,
          ...(children.length > 0 ? { children } : {}),
        };
      })
      .filter((item): item is TreeListItem => item !== null);
  }

  private normalizeTreeGroups(value: unknown): Array<{
    name: string;
    icon: string;
    items: TreeListItem[];
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
        const items = this.normalizeTreeItems(group['items']);

        return {
          name,
          icon,
          items,
        };
      })
      .filter(
        (group): group is { name: string; icon: string; items: TreeListItem[] } =>
          group !== null,
      );
  }

  private isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
      return [...fallback];
    }

    const seen = new Set<string>();
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => {
        if (item.length === 0) {
          return false;
        }

        if (seen.has(item)) {
          return false;
        }

        seen.add(item);
        return true;
      });
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

  private createDefaultTreeCollection(): { name: string; icon: string; items: TreeListItem[] } {
    return {
      name: '',
      icon: 'pi pi-folder',
      items: [this.createDefaultTreeGroupItem(1)],
    };
  }

  private createDefaultTreeGroupItem(_nextIndex: number): TreeListItem {
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

  updateCardTitle(cardId: string, value: string): void {
    this.updateDraftCard(cardId, (draft) => {
      draft.title = value;
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

  updateTechCategoryLabel(
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

      element.items[categoryIndex].label = value;
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
          items: element.items
            .filter((_, categoryIndex) => {
              return !pendingDeletes.has(
                this.getPendingDeleteItemKey(elementIndex, categoryIndex, undefined, categoryIndex),
              );
            })
            .map((category, categoryIndex) => ({
              ...category,
              value: category.value.filter((_, itemIndex) => {
                return !pendingDeletes.has(
                  this.getPendingDeleteItemKey(elementIndex, itemIndex, categoryIndex),
                );
              }),
            })),
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
        value: this.normalizeStringArray(stack.language, []),
        severity: 'info' as const,
      },
      {
        label: labels.frontend,
        value: this.normalizeStringArray(stack.frontend, []),
        severity: 'success' as const,
      },
      {
        label: labels.backend,
        value: this.normalizeStringArray(stack.backend, []),
        severity: 'warning' as const,
      },
      {
        label: labels.database,
        value: this.normalizeStringArray(stack.database, []),
        severity: 'danger' as const,
      },
      {
        label: labels.devops,
        value: this.normalizeStringArray(stack.devops, []),
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
