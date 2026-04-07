import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { GroupListComponent } from '../../../uikit/group-list.component';
import { ResumeCardElement } from './resume-card-element.model';

/** 文字元素變更事件。 */
export interface ElementTextChange {
  elementIndex: number;
  value: string;
}

/** 一般項目變更事件。 */
export interface ElementItemChange {
  elementIndex: number;
  itemIndex: number;
  value: string;
}

/** 技術分類變更事件。 */
export interface ElementTechCategoryChange {
  elementIndex: number;
  categoryIndex: number;
  value: string;
}

/** 分組項目文字變更事件。 */
export interface ElementGroupItemChange {
  elementIndex: number;
  groupIndex: number;
  itemIndex: number;
  value: string;
}

/** 分組項目圖示變更事件。 */
export interface ElementGroupItemIconChange {
  elementIndex: number;
  groupIndex: number;
  itemIndex: number;
  icon: string;
}

/** 元素刪除事件。 */
export interface ElementDeleteItemChange {
  elementIndex: number;
  itemIndex: number;
  groupIndex?: number;
  categoryIndex?: number;
}

/** 單一卡片元素渲染元件，封裝 switch 分支內容。 */
@Component({
  selector: 'app-resume-card-element',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, InputTextModule, TextareaModule, GroupListComponent],
  templateUrl: './resume-card-element.component.html',
  styleUrl: './resume-card-element.component.scss',
})
export class ResumeCardElementComponent {
  @Input({ required: true }) element!: ResumeCardElement;
  @Input({ required: true }) elementIndex!: number;
  @Input() isEditing = false;
  @Input() isSaving = false;
  @Input() addLabel = 'Add';
  @Input() pendingDeleteItemKeys: Set<string> | null = null;
  @Input() iconOptions: Array<{ icon: string; label: string }> = [];

  @Output() textElementChange = new EventEmitter<ElementTextChange>();
  @Output() badgeItemChange = new EventEmitter<ElementItemChange>();
  @Output() iconListItemChange = new EventEmitter<ElementItemChange>();
  @Output() techCategoryChange = new EventEmitter<ElementTechCategoryChange>();
  @Output() groupItemChange = new EventEmitter<ElementGroupItemChange>();
  @Output() groupItemIconChange = new EventEmitter<ElementGroupItemIconChange>();
  @Output() addItem = new EventEmitter<number>();
  @Output() deleteItem = new EventEmitter<ElementDeleteItemChange>();

  /** 依圖示代碼取得顯示名稱；若查無對應則回傳原始代碼。 */
  getIconLabel(icon: string | null | undefined): string {
    if (!icon) {
      return '';
    }

    return this.iconOptions.find((option) => option.icon === icon)?.label ?? icon;
  }

  /** 觸發新增項目事件。 */
  onAddItem(): void {
    this.addItem.emit(this.elementIndex);
  }

  /** 觸發刪除項目事件。 */
  onDeleteItem(payload: Omit<ElementDeleteItemChange, 'elementIndex'>): void {
    this.deleteItem.emit({ elementIndex: this.elementIndex, ...payload });
  }

  /** 判斷指定項目是否處於待刪除狀態。 */
  isCardItemPendingDelete(itemIndex: number, groupIndex?: number, categoryIndex?: number): boolean {
    return this.pendingDeleteItemKeys?.has(
      this.getPendingDeleteItemKey(itemIndex, groupIndex, categoryIndex),
    ) ?? false;
  }

  /** 觸發文字元素變更事件。 */
  onTextElementChange(value: string): void {
    this.textElementChange.emit({ elementIndex: this.elementIndex, value });
  }

  /** 觸發徽章項目變更事件。 */
  onBadgeItemChange(itemIndex: number, value: string): void {
    this.badgeItemChange.emit({ elementIndex: this.elementIndex, itemIndex, value });
  }

  /** 觸發圖示清單項目變更事件。 */
  onIconListItemChange(itemIndex: number, value: string): void {
    this.iconListItemChange.emit({ elementIndex: this.elementIndex, itemIndex, value });
  }

  /** 觸發技術分類名稱變更事件。 */
  onTechCategoryChange(categoryIndex: number, value: string): void {
    this.techCategoryChange.emit({ elementIndex: this.elementIndex, categoryIndex, value });
  }

  /** 觸發分組項目文字變更事件。 */
  onGroupItemChange(groupIndex: number, itemIndex: number, value: string): void {
    this.groupItemChange.emit({ elementIndex: this.elementIndex, groupIndex, itemIndex, value });
  }

  /** 觸發分組項目圖示變更事件。 */
  onGroupItemIconChange(groupIndex: number, itemIndex: number, icon: string): void {
    this.groupItemIconChange.emit({ elementIndex: this.elementIndex, groupIndex, itemIndex, icon });
  }

  /** 將分類值陣列轉為逗號分隔字串。 */
  getTechCategoryValueText(values: string[]): string {
    return values.join(', ');
  }

  /** 產生待刪除項目的唯一鍵值。 */
  private getPendingDeleteItemKey(itemIndex: number, groupIndex?: number, categoryIndex?: number): string {
    if (typeof categoryIndex === 'number') {
      return `${this.elementIndex}:category:${categoryIndex}`;
    }

    if (typeof groupIndex === 'number') {
      return `${this.elementIndex}:group:${groupIndex}:${itemIndex}`;
    }

    return `${this.elementIndex}:item:${itemIndex}`;
  }
}
