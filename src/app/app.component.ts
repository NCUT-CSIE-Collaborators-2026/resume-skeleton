import { Component, HostListener, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import i18n from './i18n.json';

type LangCode = 'en' | 'zh_TW';

interface ResumeLocale {
  profile: {
    name: string;
    title: string;
    gender: string;
    age: string;
    status: string;
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

const RESUME_I18N = i18n as Record<LangCode, ResumeLocale>;

@Component({
  selector: 'app-root',
  imports: [ButtonModule, CardModule, ChipModule, TagModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly activeLang = signal<LangCode>('zh_TW');
  readonly introMode = signal<'30' | '60'>(this.getIntroModeFromHash());

  readonly languageOptions: Array<{ label: string; code: LangCode }> = [
    { label: 'ZH', code: 'zh_TW' },
    { label: 'EN', code: 'en' }
  ];

  readonly content = computed(() => RESUME_I18N[this.activeLang()]);

  readonly uiCopy = computed<UiCopy>(() => {
    if (this.activeLang() === 'zh_TW') {
      return {
        introTitle: '自我介紹',
        educationTitle: '學歷背景',
        expTitle: '經歷概覽',
        stackTitle: '技術堆疊',
        skillsTitle: this.content().experience.skills_label,
        projectTitle: this.content().experience.projects_label,
        projects: [
          '履歷網站樣板：完成中英切換、響應式版面與元件化設計。',
          'Angular + NestJS 全端專案：實作 API 串接、部署流程與版本控管。'
        ],
        labels: {
          language: '語言',
          frontend: 'Frontend',
          backend: 'Backend',
          database: '資料庫',
          devops: 'DevOps'
        }
      };
    }

    return {
      introTitle: 'Self Introduction',
      educationTitle: 'Education',
      expTitle: 'Experience',
      stackTitle: 'Tech Stack',
      skillsTitle: this.content().experience.skills_label,
      projectTitle: this.content().experience.projects_label,
      projects: [
        'Resume website template with bilingual switch, responsive layout, and componentized design.',
        'Angular + NestJS full-stack work including API integration, deployment flow, and version control.'
      ],
      labels: {
        language: 'Language',
        frontend: 'Frontend',
        backend: 'Backend',
        database: 'Database',
        devops: 'DevOps'
      }
    };
  });

  readonly profileBadges = computed(() => [
    this.content().profile.gender,
    this.content().profile.age
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
