import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal, ViewChild } from '@angular/core';
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
export class TopBarComponent implements OnChanges {
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

  @ViewChild('desktopEditorMenu') desktopEditorMenu?: Menu;
  @ViewChild('mobileEditorMenu') mobileEditorMenu?: Menu;

  private activeEditorMenu: Menu | null = null;

  editorMenuItems: MenuItem[] = [];
  mobileMenuItems: MenuItem[] = [];

  readonly menuOpen = signal(false);

  get currentModeLabel(): string {
    return this.isA4Mode ? 'RWD 模式' : 'A4 模式';
  }

  ngOnChanges(_: SimpleChanges): void {
    this.rebuildMenuModels();
  }

  private rebuildMenuModels(): void {
    this.editorMenuItems = this.buildEditorMenuItems();
    this.mobileMenuItems = this.buildMobileMenuItems();
  }

  private buildEditorMenuItems(): MenuItem[] {
    if (this.editorUser) {
      return [
        {
          label: '登出',
          command: () => this.runMenuCommand('editor:logout', () => this.onLogout()),
          icon: 'pi pi-sign-out',
        },
      ];
    } else {
      return [
        {
          label: '登入',
          icon: 'pi pi-sign-in',
          command: () => this.logMenuClick('editor:login'),
          url: 'https://resume-api-haolun-wang.9b117201.workers.dev/api/resume/auth/google/login',
          target: '_self',
        },
      ];
    }
  }

  private buildMobileMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    const languageOptions = this.languageOptions ?? [];
    // 語言切換
    languageOptions.forEach(option => {
      items.push({
        label: option.label,
        command: () => this.runMenuCommand(`mobile:language:${option.code}`, () => this.onLanguageChange(option.code)),
        styleClass: `language-item ${this.activeLang === option.code ? 'active' : ''}`
      });
    });
    items.push({ separator: true });
    // A4/RWD 切換
    items.push({
      label: this.currentModeLabel,
      icon: 'pi pi-arrow-right',
      command: () => this.runMenuCommand('mobile:toggle-a4', () => this.onA4ModeToggle()),
      styleClass: this.isA4Mode ? 'active' : ''
    });
    // PDF 下載
    items.push({
      label: this.barUi?.exportPdfLabel ?? 'Export PDF',
      icon: this.isExporting ? 'pi pi-spinner pi-spin' : 'pi pi-download',
      command: () => this.runMenuCommand('mobile:export-pdf', () => this.onExportPdf()),
      disabled: this.isExporting
    });
    // 登出/登入
    if (this.editorUser) {
      items.push({
        label: '登出',
        icon: 'pi pi-sign-out',
        command: () => this.runMenuCommand('mobile:logout', () => this.onLogout())
      });
    } else {
      items.push({
        label: '登入',
        icon: 'pi pi-google',
        command: () => this.logMenuClick('mobile:login'),
        url: 'https://resume-api-haolun-wang.9b117201.workers.dev/api/resume/auth/google/login',
        target: '_self'
      });
    }
    return items;
  }

  private logMenuClick(tag: string): void {
    console.log('[TopBarMenu]', tag);
  }

  private runMenuCommand(tag: string, action: () => void): void {
    this.logMenuClick(tag);
    action();
  }

  onLanguageChange(code: 'en' | 'zh_TW'): void {
    this.languageChange.emit(code);
    this.rebuildMenuModels();
    this.menuOpen.set(false);
  }

  onA4ModeToggle(): void {
    this.a4ModeChange.emit(!this.isA4Mode);
    this.rebuildMenuModels();
    this.menuOpen.set(false);
  }

  onExportPdf(): void {
    this.exportPdf.emit();
    this.rebuildMenuModels();
    this.menuOpen.set(false);
  }

  toggleEditorMenu(event: Event, menu: Menu): void {
    event.preventDefault();
    event.stopPropagation();

    // Ensure only one overlay menu is open to avoid click-swallow behavior.
    if (this.desktopEditorMenu && this.desktopEditorMenu !== menu) {
      this.desktopEditorMenu.hide();
    }
    if (this.mobileEditorMenu && this.mobileEditorMenu !== menu) {
      this.mobileEditorMenu.hide();
    }

    const isVisible = (menu as Menu & { overlayVisible?: boolean }).overlayVisible === true;
    this.activeEditorMenu = menu;
    if (isVisible) {
      menu.hide();
      return;
    }

    menu.show(event);
  }

  onLogout(): void {
    this.logout.emit();
    this.rebuildMenuModels();
    if (this.activeEditorMenu) {
      this.activeEditorMenu.hide();
    }
    this.menuOpen.set(false);
  }
}
