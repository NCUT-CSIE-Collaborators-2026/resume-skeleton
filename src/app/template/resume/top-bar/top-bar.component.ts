import { Component, EventEmitter, Input, Output, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss'
})
export class TopBarComponent {
  @Input() profile!: Profile;
  @Input() languageOptions!: LanguageOption[];
  @Input() activeLang!: 'en' | 'zh_TW';
  @Input() isA4Mode!: boolean;
  @Input() isExporting!: boolean;
  @Input() barUi!: BarUi;

  @Output() languageChange = new EventEmitter<'en' | 'zh_TW'>();
  @Output() a4ModeChange = new EventEmitter<boolean>();
  @Output() exportPdf = new EventEmitter<void>();

  onLanguageChange(code: 'en' | 'zh_TW'): void {
    this.languageChange.emit(code);
  }

  onA4ModeToggle(): void {
    this.a4ModeChange.emit(!this.isA4Mode);
  }

  onExportPdf(): void {
    this.exportPdf.emit();
  }
}
