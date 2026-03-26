import { Component, ElementRef, HostListener, ViewChild, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupListComponent } from '../../uikit/group-list.component';
import i18nData from '../../ui.i18n.json';
import contentData from '../../content.i18n.json';

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
      items: Array<{ label: string; value: string[]; severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary' }>;
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

const RESUME_I18N = Object.entries(i18nData as Record<LangCode, I18nLocale>).reduce(
  (acc, [lang, i18n]) => {
    acc[lang as LangCode] = {
      ...i18n,
      ...(contentData as Record<LangCode, ContentLocale>)[lang as LangCode]
    } as ResumeLocale;
    return acc;
  },
  {} as Record<LangCode, ResumeLocale>
);

@Component({
  selector: 'resume',
  imports: [CommonModule, GroupListComponent],
  templateUrl: './resume.component.html',
  styleUrl: './resume.component.scss',
})
export class ResumeComponent {
  @ViewChild('resumeCanvas') resumeCanvas?: ElementRef<HTMLElement>;

  readonly activeLang = signal<LangCode>(this.getInitialLanguage());
  readonly introMode = signal<'30' | '60'>(this.getIntroModeFromHash());
  readonly isExporting = signal(false);
  readonly isA4Mode = signal(true);  // 預設啟用 A4 模式

  constructor() {
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
  }

  readonly languageOptions = computed(() =>
    Object.entries(RESUME_I18N).map(([code, locale]) => ({
      label: locale.config.label,
      code: code as LangCode
    }))
  );

  readonly content = computed(() => RESUME_I18N[this.activeLang()]);

  readonly uiCopy = computed<UiCopy>(() => {
    const content = this.content();
    return {
      introTitle: content['content-ui'].introTitle,
      educationTitle: content['content-ui'].educationTitle,
      expTitle: content['content-ui'].expTitle,
      stackTitle: content['content-ui'].stackTitle,
      projectTitle: content['content-ui'].projectsTitle,
      labels: content['content-ui'].labels
    };
  });

  readonly projectItems = computed(() => this.content().projects.items);

  readonly barUi = computed<BarUi>(() => {
    const content = this.content();
    return {
      exportPdfLabel: content['bar-ui'].exportPdfLabel,
      exportingLabel: content['bar-ui'].exportingLabel
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
    this.content().experience.military_title
  ]);

  // 經驗資料轉換為groups格式（3個GROUP，各有1筆資料）
  readonly experienceGroups = computed(() => {
    const exps = this.experiences();
    return exps.map(exp => ({
      name: 'Experience',
      items: [{
        label: 'experience',
        value: exp,
        icon: 'pi pi-briefcase'
      }]
    }));
  });

  readonly introText = computed(() =>
    this.introMode() === '30'
      ? this.content().introductions.pitch_30s
      : this.content().introductions.pitch_1min
  );

  // 技術堆疊卡片的動態寬度：根據項目數量自動調整
  readonly stackCardLayout = computed(() => {
    const stackItems = this.getTechStackData();
    if (stackItems.length > 6) return 8;  // 超過6項，用8列
    if (stackItems.length > 4) return 6;  // 5-6項，用6列
    return 4;  // 4項以下，用4列
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
        elements: [
          { type: 'badges', items: this.profileBadges() }
        ]
      },
      // 介紹卡
      {
        id: 'intro',
        title: ui.introTitle,
        layout: 6,
        elements: [
          { type: 'text', text: this.introText() }
        ]
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
            gridLayout: 'compact'
          }
        ]
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
            gridLayout: 'compact'
          }
        ]
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
            gridLayout: 'compact'
          }
        ]
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
            items: this.projectItems()
          }
        ]
      }
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
            layout: adjusted[adjusted.length - 1].layout + (12 - rowSpan)
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
        layout: adjusted[adjusted.length - 1].layout + (12 - rowSpan)
      };
    }

    return adjusted;
  });

  setLanguage(lang: string | LangCode): void {
    if (lang === 'en' || lang === 'zh_TW') {
      this.activeLang.set(lang);
      this.saveLanguageToLocalStorage(lang);
    }
  }

  private getInitialLanguage(): LangCode {
    if (typeof window === 'undefined') {
      return 'zh_TW';
    }

    const saved = localStorage.getItem('resume-language');
    if (saved === 'en' || saved === 'zh_TW') {
      return saved as LangCode;
    }

    return 'zh_TW';
  }

  private saveLanguageToLocalStorage(lang: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resume-language', lang);
    }
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
        import('jspdf')
      ]);

      const source = this.resumeCanvas.nativeElement;
      const canvas = await html2canvas(source, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 2,
        logging: false,
        onclone: (clonedDocument: Document) => {
          const clonedCanvas = clonedDocument.querySelector('.resume-canvas');
          if (clonedCanvas instanceof HTMLElement) {
            // 新增 PDF 模式類
            clonedCanvas.classList.add('resume-canvas--pdf');

            // 移除 action-panel（語言選擇和下載按鈕）
            const actionPanel = clonedCanvas.querySelector('.action-panel');
            if (actionPanel?.parentNode) {
              actionPanel.parentNode.removeChild(actionPanel);
            }

            // 移除 ambient 背景裝飾元素
            clonedCanvas.querySelectorAll('.ambient').forEach((ambient) => {
              ambient.parentNode?.removeChild(ambient);
            });
          }
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
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

      pdf.addImage(imageData, 'PNG', leftMargin, topMargin, imgWidth, imgHeight);
      pdf.save(this.activeLang() === 'zh_TW' ? 'resume-zh.pdf' : 'resume-en.pdf');
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
      { label: labels.language, value: stack.language, severity: 'info' as const },
      { label: labels.frontend, value: stack.frontend, severity: 'success' as const },
      { label: labels.backend, value: stack.backend, severity: 'warning' as const },
      { label: labels.database, value: stack.database, severity: 'danger' as const },
      { label: labels.devops, value: stack.devops, severity: 'secondary' as const }
    ];
  }

  // 教育資料驅動
  getEducationData() {
    const education = this.content().education;

    return [
      {
        name: 'Education Info',
        items: [
          { label: 'school', value: education.school, icon: 'pi pi-building-columns' },
          { label: 'department', value: education.department, icon: 'pi pi-book' },
          { label: 'degree', value: `${education.degree} | ${education.graduation_status}`, icon: 'pi pi-graduation-cap' }
        ]
      }
    ];
  }
}
