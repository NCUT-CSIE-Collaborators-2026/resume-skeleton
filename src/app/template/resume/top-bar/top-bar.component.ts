import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule, Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

export interface LanguageOption {
  label: string;
  code: 'en' | 'zh_TW';
}

export interface Profile {
  name: string;
  title: string;
}

export interface BarUi {
  exportPdfLabel: string;
  exportingLabel: string;
}

export interface EditorUser {
  name: string;
  picture: string | null;
}

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss'
})
export class TopBarComponent {
  @Input() profile!: Profile;
  @Input() editorUser: EditorUser | null = null;
  @Input() languageOptions!: LanguageOption[];
  @Input() activeLang!: 'en' | 'zh_TW';
  @Input() isA4Mode!: boolean;
  @Input() isExporting!: boolean;
  @Input() barUi!: BarUi;

  @Output() languageChange = new EventEmitter<'en' | 'zh_TW'>();
  @Output() a4ModeChange = new EventEmitter<boolean>();
  @Output() exportPdf = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  private activeEditorMenu: Menu | null = null;

  readonly menuOpen = signal(false);

  get currentModeLabel(): string {
    return this.isA4Mode ? 'RWD 模式' : 'A4 模式';
  }

  get editorMenuItems(): MenuItem[] {
    if (this.editorUser) {
      return [
        {
          label: '登出',
          command: () => this.onLogout(),
          icon: 'pi pi-sign-out',
        },
      ];
    } else {
      return [
        {
          label: '登入',
          icon: 'pi pi-sign-in',
          url: 'https://resume-api-haolun-wang.9b117201.workers.dev/api/resume/auth/google/login',
          target: '_self',
        },
      ];
    }
  }

  get mobileMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    // 語言切換
    this.languageOptions.forEach(option => {
      items.push({
        label: option.label,
        command: () => this.onLanguageChange(option.code),
        styleClass: `language-item ${this.activeLang === option.code ? 'active' : ''}`
      });
    });
    items.push({ separator: true });
    // A4/RWD 切換
    items.push({
      label: this.currentModeLabel,
      icon: 'pi pi-arrow-right',
      command: () => this.onA4ModeToggle(),
      styleClass: this.isA4Mode ? 'active' : ''
    });
    // PDF 下載
    items.push({
      label: this.barUi.exportPdfLabel,
      icon: this.isExporting ? 'pi pi-spinner pi-spin' : 'pi pi-download',
      command: () => this.onExportPdf(),
      disabled: this.isExporting
    });
    // 登出/登入
    if (this.editorUser) {
      items.push({
        label: '登出',
        icon: 'pi pi-sign-out',
        command: () => this.onLogout()
      });
    } else {
      items.push({
        label: '登入',
        icon: 'pi pi-google',
        url: 'https://resume-api-haolun-wang.9b117201.workers.dev/api/resume/auth/google/login',
        target: '_self'
      });
    }
    return items;
  }

  onLanguageChange(code: 'en' | 'zh_TW'): void {
    this.languageChange.emit(code);
    this.menuOpen.set(false);
  }

  onA4ModeToggle(): void {
    this.a4ModeChange.emit(!this.isA4Mode);
    this.menuOpen.set(false);
  }

  onExportPdf(): void {
    this.exportPdf.emit();
    this.menuOpen.set(false);
  }

  toggleEditorMenu(event: Event, menu: Menu): void {
    event.stopPropagation();
    this.activeEditorMenu = menu;
    menu.toggle(event);
  }

  onLogout(): void {
    this.logout.emit();
    if (this.activeEditorMenu) {
      this.activeEditorMenu.hide();
    }
    this.menuOpen.set(false);
  }
}
