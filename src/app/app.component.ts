import { Component, ElementRef, HostListener, ViewChild, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import i18n from './i18n.json';

type LangCode = 'en' | 'zh_TW';

interface ResumeLocale {
  config: {
    code: LangCode;
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
    exportPdfLabel: string;
    projects: string[];
    labels: {
      language: string;
      frontend: string;
      backend: string;
      database: string;
      devops: string;
    };
  };
}

interface UiCopy {
  introTitle: string;
  educationTitle: string;
  expTitle: string;
  stackTitle: string;
  skillsTitle: string;
  projectTitle: string;
  exportPdfLabel: string;
  projects: string[];
  labels: {
    language: string;
    frontend: string;
    backend: string;
    database: string;
    devops: string;
  };
}

const RESUME_I18N = i18n as Record<LangCode, ResumeLocale>;

@Component({
  selector: 'app-root',
  imports: [ButtonModule, CardModule, ChipModule, TagModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild('resumeCanvas') resumeCanvas?: ElementRef<HTMLElement>;

  readonly activeLang = signal<LangCode>(this.getInitialLanguage());
  readonly introMode = signal<'30' | '60'>(this.getIntroModeFromHash());
  readonly isExporting = signal(false);

  readonly languageOptions = computed(() =>
    Object.values(RESUME_I18N).map(locale => ({
      label: locale.config.label,
      code: locale.config.code
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
      exportPdfLabel: content['content-ui'].exportPdfLabel,
      projects: content['content-ui'].projects,
      labels: content['content-ui'].labels
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
      { label: labels.backend, value: stack.backend, severity: 'warn' as const },
      { label: labels.database, value: stack.database, severity: 'contrast' as const },
      { label: labels.devops, value: stack.devops, severity: 'secondary' as const }
    ];
  });

  setLanguage(lang: LangCode): void {
    this.activeLang.set(lang);
    this.saveLanguageToLocalStorage(lang);
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

  private saveLanguageToLocalStorage(lang: LangCode): void {
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
            // Apply PDF-specific styling through CSS class
            clonedCanvas.classList.add('resume-canvas--pdf');
            clonedCanvas.classList.add('pdf-capture-mode');
          }
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight();  // 297mm
      const imageData = canvas.toDataURL('image/png');

      // 根据 A4 比例调整图像尺寸（确保完整显示且不超出）
      const topMargin = 5;
      const maxWidth = pageWidth - 10; // 左右边距
      const maxHeight = pageHeight - 10; // 上下边距
      
      // 计算 canvas 的宽高比
      const canvasAspect = canvas.height / canvas.width;
      
      // 计算合适的尺寸（保持宽高比，不超出页面）
      let imgWidth = maxWidth;
      let imgHeight = maxWidth * canvasAspect;
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = maxHeight / canvasAspect;
      }
      
      // 计算左边距以使图像居中
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
