import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

export interface IconOption {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-icon-select-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule],
  template: `
    <p-select
      [options]="options"
      optionValue="icon"
      [ngModel]="icon"
      (ngModelChange)="onIconChange($event)"
      class="icon-dropdown"
      [showClear]="false"
      [appendTo]="'body'"
      [overlayOptions]="{ autoZIndex: true, baseZIndex: 12000 }"
    >
      <ng-template pTemplate="item" let-option>
        <i [class]="option.icon" [title]="option.label"></i>
      </ng-template>
      <ng-template pTemplate="selectedItem" let-selectedOption>
        <i
          [class]="selectedOption?.icon ?? selectedOption"
          [title]="getIconLabel(selectedOption?.icon ?? selectedOption)"
        ></i>
      </ng-template>
    </p-select>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .icon-dropdown {
        width: auto;
        min-width: 3.5rem;
        max-width: 100%;

        :deep(.p-select-dropdown) {
          display: none;
        }

        :deep(.p-select-label) {
          padding: 0;
          font-size: 0;
        }

        :deep(.p-select-list) {
          padding: 0.5rem;
        }

        :deep(.p-select-option) {
          padding: 0.35rem 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    `,
  ],
})
export class IconSelectMenuComponent {
  @Input() icon = '';
  @Input() options: IconOption[] = [];
  @Output() iconChange = new EventEmitter<string>();

  getIconLabel(icon: string | null | undefined): string {
    if (!icon) {
      return '';
    }

    return this.options.find((option) => option.icon === icon)?.label ?? icon;
  }

  onIconChange(icon: string): void {
    this.iconChange.emit(icon);
  }
}
