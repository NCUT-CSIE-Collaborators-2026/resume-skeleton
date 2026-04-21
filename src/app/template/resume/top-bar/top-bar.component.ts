import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { environment } from '../../../config/environment';

/** 語言選項資料結構。 */
export interface LanguageOption {
  label: string;
  code: 'en' | 'zh_TW';
}

/** 個人基本資訊。 */
export interface Profile {
  name: string;
  title: string;
}

/** 頂部工具列文案設定。 */
export interface TopBarUi {
  editorMenuLabel: string;
  loginLabel: string;
  logoutLabel: string;
  modeRwdLabel: string;
  modeA4Label: string;
  exportPdfLabel: string;
  exportingLabel: string;
}

/** 目前登入的編輯者資訊。 */
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
  @Input() topBarUi!: TopBarUi;

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

  /** 依目前模式回傳切換按鈕顯示文字。 */
  get currentModeLabel(): string {
    const modeLabel = this.isA4Mode
      ? this.topBarUi?.modeRwdLabel
      : this.topBarUi?.modeA4Label;

    return modeLabel ?? (this.isA4Mode ? 'RWD Mode' : 'A4 Mode');
  }

  /** 輸入變更後重建所有選單模型。 */
  ngOnChanges(_: SimpleChanges): void {
    this.rebuildMenuModels();
  }

  /** 重建桌機與行動版選單資料。 */
  private rebuildMenuModels(): void {
    this.editorMenuItems = this.buildEditorMenuItems();
    this.mobileMenuItems = this.buildMobileMenuItems();
  }

  /** 建立編輯者功能選單。 */
  private buildEditorMenuItems(): MenuItem[] {
    const loginUrl = `${environment.apiUrl}${environment.apiBasePath}${environment.apiEndpoints.authGoogleLogin}`;

    if (this.editorUser) {
      return [
        {
          label: this.topBarUi?.logoutLabel ?? 'Logout',
          command: () => this.onLogout(),
          icon: 'pi pi-sign-out',
        },
      ];
    }

    return [
      {
        label: this.topBarUi?.loginLabel ?? 'Login',
        icon: 'pi pi-sign-in',
        url: loginUrl,
        target: '_self',
      },
    ];
  }

  /** 建立行動版選單（語言、模式、匯出、登入狀態）。 */
  private buildMobileMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    const loginUrl = `${environment.apiUrl}${environment.apiBasePath}${environment.apiEndpoints.authGoogleLogin}`;
    const languageOptions = this.languageOptions ?? [];

    languageOptions.forEach((option) => {
      items.push({
        label: option.label,
        command: () => this.onLanguageChange(option.code),
        styleClass: `language-item ${this.activeLang === option.code ? 'active' : ''}`,
      });
    });

    items.push({ separator: true });
    items.push({
      label: this.currentModeLabel,
      icon: 'pi pi-arrow-right',
      command: () => this.onA4ModeToggle(),
      styleClass: this.isA4Mode ? 'active' : '',
    });
    items.push({
      label: this.topBarUi?.exportPdfLabel ?? 'Export PDF',
      icon: this.isExporting ? 'pi pi-spinner pi-spin' : 'pi pi-download',
      command: () => this.onExportPdf(),
      disabled: this.isExporting,
    });

    if (this.editorUser) {
      items.push({
        label: this.topBarUi?.logoutLabel ?? 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.onLogout(),
      });
    } else {
      items.push({
        label: this.topBarUi?.loginLabel ?? 'Login',
        icon: 'pi pi-google',
        url: loginUrl,
        target: '_self',
      });
    }

    return items;
  }

  /** 觸發語言切換事件並關閉選單。 */
  onLanguageChange(code: 'en' | 'zh_TW'): void {
    this.languageChange.emit(code);
    this.rebuildMenuModels();
    this.menuOpen.set(false);
  }

  /** 切換 A4 / RWD 模式並關閉選單。 */
  onA4ModeToggle(): void {
    this.a4ModeChange.emit(!this.isA4Mode);
    this.rebuildMenuModels();
    this.menuOpen.set(false);
  }

  /** 觸發 PDF 匯出事件並關閉選單。 */
  onExportPdf(): void {
    this.exportPdf.emit();
    this.rebuildMenuModels();
    this.menuOpen.set(false);
  }

  /** 切換指定選單，並確保同一時間僅有一個浮層選單開啟。 */
  toggleEditorMenu(event: Event, menu: Menu): void {
    event.preventDefault();
    event.stopPropagation();

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

  /** 觸發登出事件並關閉目前開啟的選單。 */
  onLogout(): void {
    this.logout.emit();
    this.rebuildMenuModels();
    if (this.activeEditorMenu) {
      this.activeEditorMenu.hide();
    }
    this.menuOpen.set(false);
  }
}
