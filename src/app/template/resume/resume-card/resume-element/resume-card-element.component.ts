import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { IconSelectMenuComponent } from '../../../../uikit/icon-select-menu.component';
import { GroupListComponent } from '../../../../uikit/group-list.component';
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

/** 技術分類標題變更事件。 */
export interface ElementTechCategoryLabelChange {
  elementIndex: number;
  categoryIndex: number;
  value: string;
}

/** 樹分組項目文字變更事件。 */
export interface ElementTreeGroupItemChange {
  elementIndex: number;
  treeGroupIndex: number;
  itemIndex: number;
  value: string;
}

/** 樹分組項目圖示變更事件。 */
export interface ElementTreeGroupItemIconChange {
  elementIndex: number;
  treeGroupIndex: number;
  itemIndex: number;
  icon: string;
}

/** 樹分組標題變更事件。 */
export interface ElementTreeGroupNameChange {
  elementIndex: number;
  treeGroupIndex: number;
  value: string;
}

/** 樹分組父層圖示變更事件。 */
export interface ElementTreeGroupIconChange {
  elementIndex: number;
  treeGroupIndex: number;
  icon: string;
}

/** 元素刪除事件。 */
export interface ElementDeleteItemChange {
  elementIndex: number;
  itemIndex?: number;
  treeGroupIndex?: number;
  categoryIndex?: number;
  deleteTreeGroup?: boolean;
}

/** 單一樹卡節點渲染元件，封裝 switch 分支內容。 */
@Component({
  selector: 'app-tree-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    GroupListComponent,
    IconSelectMenuComponent,
  ],
  templateUrl: './resume-card-element.component.html',
  styleUrl: './resume-card-element.component.scss',
})
export class TreeCardComponent {
  @Input({ required: true }) element!: ResumeCardElement;
  @Input({ required: true }) elementIndex!: number;
  @Input() path: number[] = [];
  @Input() isEditing = false;
  @Input() isSaving = false;
  @Input() addLabel = 'Add';
  @Input() addItemLabel = 'Add item';
  @Input() addCollectionLabel = 'Add collection';
  @Input() newCollectionName = 'New collection';
  @Input() newItemValue = 'New item';
  @Input() pendingDeleteItemKeys: Set<string> | null = null;
  @Input() iconOptions: Array<{ icon: string; label: string }> = [];

  @Output() textElementChange = new EventEmitter<ElementTextChange>();
  @Output() badgeItemChange = new EventEmitter<ElementItemChange>();
  @Output() iconListItemChange = new EventEmitter<ElementItemChange>();
  @Output() techCategoryChange = new EventEmitter<ElementTechCategoryChange>();
  @Output() techCategoryLabelChange = new EventEmitter<ElementTechCategoryLabelChange>();
  @Output() treeGroupItemChange = new EventEmitter<ElementTreeGroupItemChange>();
  @Output() treeGroupItemIconChange = new EventEmitter<ElementTreeGroupItemIconChange>();
  @Output() treeGroupNameChange = new EventEmitter<ElementTreeGroupNameChange>();
  @Output() treeGroupIconChange = new EventEmitter<ElementTreeGroupIconChange>();
  @Output() addItem = new EventEmitter<number[]>();
  @Output() deleteItem = new EventEmitter<ElementDeleteItemChange>();

  /** 觸發新增項目事件。 */
  onAddItem(pathOverride: number[] = this.path): void {
    this.addItem.emit(pathOverride);
  }

  /** 觸發刪除項目事件。 */
  onDeleteItem(payload: Omit<ElementDeleteItemChange, 'elementIndex'>): void {
    this.deleteItem.emit({ elementIndex: this.elementIndex, ...payload });
  }

  /** 判斷指定項目是否處於待刪除狀態。 */
  isCardItemPendingDelete(itemIndex: number, treeGroupIndex?: number, categoryIndex?: number): boolean {
    return this.pendingDeleteItemKeys?.has(
      this.getPendingDeleteItemKey(itemIndex, treeGroupIndex, categoryIndex),
    ) ?? false;
  }

  /** 判斷指定分組是否處於待刪除狀態。 */
  isCardGroupPendingDelete(treeGroupIndex: number): boolean {
    return this.pendingDeleteItemKeys?.has(
      this.getPendingDeleteGroupKey(treeGroupIndex),
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

  /** 觸發技術分類標題變更事件。 */
  onTechCategoryLabelChange(categoryIndex: number, value: string): void {
    this.techCategoryLabelChange.emit({ elementIndex: this.elementIndex, categoryIndex, value });
  }

  /** 觸發技術分類子項變更事件。 */
  onTechCategoryItemChange(categoryIndex: number, itemIndex: number, value: string): void {
    if (this.element.type !== 'grid-tech') {
      return;
    }

    const nextValues = [...this.element.items[categoryIndex].value];
    nextValues[itemIndex] = value;
    this.onTechCategoryChange(categoryIndex, nextValues.join(', '));
  }

  /** 新增技術分類子項。 */
  onAddTechCategoryItem(categoryIndex: number): void {
    if (this.element.type !== 'grid-tech') {
      return;
    }

    const nextValues = [...this.element.items[categoryIndex].value, ''];
    this.onTechCategoryChange(categoryIndex, nextValues.join(', '));
  }

  /** 刪除技術分類子項。 */
  onDeleteTechCategoryItem(categoryIndex: number, itemIndex: number): void {
    if (this.element.type !== 'grid-tech') {
      return;
    }

    const nextValues = this.element.items[categoryIndex].value.filter((_, idx) => idx !== itemIndex);
    this.onTechCategoryChange(categoryIndex, nextValues.join(', '));
  }

  /** 觸發分組項目文字變更事件。 */
  onTreeGroupItemChange(treeGroupIndex: number, itemIndex: number, value: string): void {
    this.treeGroupItemChange.emit({ elementIndex: this.elementIndex, treeGroupIndex, itemIndex, value });
  }

  /** 觸發樹分組項目圖示變更事件。 */
  onTreeGroupItemIconChange(treeGroupIndex: number, itemIndex: number, icon: string): void {
    this.treeGroupItemIconChange.emit({ elementIndex: this.elementIndex, treeGroupIndex, itemIndex, icon });
  }

  /** 觸發樹分組標題變更事件。 */
  onTreeGroupNameChange(treeGroupIndex: number, value: string): void {
    this.treeGroupNameChange.emit({ elementIndex: this.elementIndex, treeGroupIndex, value });
  }

  /** 觸發樹分組父層圖示變更事件。 */
  onTreeGroupIconChange(treeGroupIndex: number, icon: string): void {
    this.treeGroupIconChange.emit({ elementIndex: this.elementIndex, treeGroupIndex, icon });
  }

  /** 將分類值陣列轉為逗號分隔字串。 */
  getTechCategoryValueText(values: string[]): string {
    return values.join(', ');
  }

  /** 產生待刪除項目的唯一鍵值。 */
  private getPendingDeleteItemKey(itemIndex: number, treeGroupIndex?: number, categoryIndex?: number): string {
    if (typeof categoryIndex === 'number') {
      return `${this.elementIndex}:category:${categoryIndex}`;
    }

    if (typeof treeGroupIndex === 'number') {
      return `${this.elementIndex}:group:${treeGroupIndex}:${itemIndex}`;
    }

    return `${this.elementIndex}:item:${itemIndex}`;
  }

  /** 產生待刪除分組的唯一鍵值。 */
  private getPendingDeleteGroupKey(treeGroupIndex: number): string {
    return `${this.elementIndex}:group:${treeGroupIndex}:delete`;
  }
}
