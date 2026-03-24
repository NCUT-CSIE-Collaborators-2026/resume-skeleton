import { Component, ElementRef, HostListener, ViewChild, computed, signal } from '@angular/core';
import i18nData from './i18n.json';

type LangCode = 'en' | 'zh_TW';

interface ResumeLocale {
  config: {
    code: 'en' | 'zh_TW';
    label: string;
  };
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
    skills_label: string;
    projects_label: string;
  };
  tech_stack: {
    language: string;
    frontend: string;
    backend: string;
    database: string;
    devops: string;
  };
  introductions: {
    pitch_30s: string;
    pitch_1min: string;
  };
  'content-ui': {
    introTitle: string;
    educationTitle: string;
    expTitle: string;
    stackTitle: string;
    projects: string[];
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

interface UiCopy {
  introTitle: string;
  educationTitle: string;
  expTitle: string;
  stackTitle: string;
  skillsTitle: string;
  projectTitle: string;
  projects: string[];
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

const RESUME_I18N = i18nData as Record<LangCode, ResumeLocale>;

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild('resumeCanvas') resumeCanvas?: ElementRef<HTMLElement>;

  readonly activeLang = signal<LangCode>(this.getInitialLanguage());
  readonly introMode = signal<'30' | '60'>(this.getIntroModeFromHash());
  readonly isExporting = signal(false);

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
      skillsTitle: content.experience.skills_label,
      projectTitle: content.experience.projects_label,
      projects: content['content-ui'].projects,
      labels: content['content-ui'].labels
    };
  });

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

  readonly introText = computed(() =>
    this.introMode() === '30'
      ? this.content().introductions.pitch_30s
      : this.content().introductions.pitch_1min
  );

  readonly skillChips = computed(() => {
    const stack = this.content().tech_stack;
    return [stack.language, stack.frontend, stack.backend, stack.database, stack.devops];
  });

  readonly techStack = computed(() => {
    const stack = this.content().tech_stack;
    const labels = this.uiCopy().labels;

    return [
      { label: labels.language, value: stack.language, severity: 'info' as const },
      { label: labels.frontend, value: stack.frontend, severity: 'success' as const },
      { label: labels.backend, value: stack.backend, severity: 'warning' as const },
      { label: labels.database, value: stack.database, severity: 'danger' as const },
      { label: labels.devops, value: stack.devops, severity: 'secondary' as const }
    ];
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
}
