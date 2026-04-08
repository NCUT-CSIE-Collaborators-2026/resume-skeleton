import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Card } from '../resume.model';
import { TreeCardComponent } from './resume-element/resume-card-element.component';
import {
  AddItemChange,
  BadgeItemChange,
  CardUi,
  DeleteItemChange,
  TreeGroupIconChange,
  TreeGroupItemChange,
  TreeGroupItemIconChange,
  TreeGroupNameChange,
  IconListItemChange,
  TechCategoryChange,
  TextElementChange,
} from './resume-card.types';

@Component({
  selector: 'app-resume-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TreeCardComponent],
  templateUrl: './resume-card.component.html',
  styleUrl: './resume-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeCardComponent {
  @Input({ required: true }) card!: Card;
  @Input() isAuthenticated = false;
  @Input() isEditing = false;
  @Input() isSaving = false;
  @Input() cardUi: CardUi = { addLabel: 'Add' };
  @Input() pendingDeleteItemKeys: Set<string> | null = null;

  @Output() editAction = new EventEmitter<Card>();
  @Output() cancelEdit = new EventEmitter<string>();
  @Output() textElementChange = new EventEmitter<TextElementChange>();
  @Output() badgeItemChange = new EventEmitter<BadgeItemChange>();
  @Output() iconListItemChange = new EventEmitter<IconListItemChange>();
  @Output() techCategoryChange = new EventEmitter<TechCategoryChange>();
  @Output() treeGroupItemChange = new EventEmitter<TreeGroupItemChange>();
  @Output() treeGroupItemIconChange = new EventEmitter<TreeGroupItemIconChange>();
  @Output() treeGroupNameChange = new EventEmitter<TreeGroupNameChange>();
  @Output() treeGroupIconChange = new EventEmitter<TreeGroupIconChange>();
  @Output() addItem = new EventEmitter<AddItemChange>();
  @Output() deleteItem = new EventEmitter<DeleteItemChange>();

  /** 可選擇的 PrimeIcons 與對應顯示名稱。 */
  readonly iconOptions: Array<{ icon: string; label: string }> = [
    { icon: 'pi pi-circle', label: 'Circle' },
    { icon: 'pi pi-check-circle', label: 'Check Circle' },
    { icon: 'pi pi-star', label: 'Star' },
    { icon: 'pi pi-heart', label: 'Heart' },
    { icon: 'pi pi-book', label: 'Book' },
    { icon: 'pi pi-briefcase', label: 'Briefcase' },
    { icon: 'pi pi-building-columns', label: 'Government' },
    { icon: 'pi pi-building', label: 'Building' },
    { icon: 'pi pi-graduation-cap', label: 'Graduation' },
    { icon: 'pi pi-code', label: 'Code' },
    { icon: 'pi pi-desktop', label: 'Desktop' },
    { icon: 'pi pi-database', label: 'Database' },
    { icon: 'pi pi-cog', label: 'Settings' },
    { icon: 'pi pi-wrench', label: 'Wrench' },
    { icon: 'pi pi-bolt', label: 'Bolt' },
    { icon: 'pi pi-chart-line', label: 'Chart' },
    { icon: 'pi pi-calendar', label: 'Calendar' },
    { icon: 'pi pi-clock', label: 'Clock' },
    { icon: 'pi pi-users', label: 'Users' },
    { icon: 'pi pi-user', label: 'User' },
    { icon: 'pi pi-globe', label: 'Globe' },
    { icon: 'pi pi-map-marker', label: 'Location' },
    { icon: 'pi pi-phone', label: 'Phone' },
    { icon: 'pi pi-envelope', label: 'Email' },
    { icon: 'pi pi-link', label: 'Link' },
    { icon: 'pi pi-github', label: 'GitHub' },
    { icon: 'pi pi-send', label: 'Send' },
    { icon: 'pi pi-tag', label: 'Tag' },
    { icon: 'pi pi-flag', label: 'Flag' },
    { icon: 'pi pi-trophy', label: 'Trophy' },
    { icon: 'pi pi-shield', label: 'Shield' },
  ];

  /** 觸發卡片編輯動作。 */
  onEditAction(): void {
    this.editAction.emit(this.card);
  }

  /** 觸發取消編輯動作。 */
  onCancelEdit(): void {
    this.cancelEdit.emit(this.card.id);
  }

  /** 觸發新增項目事件。 */
  onAddItem(path: number[]): void {
    this.addItem.emit({ cardId: this.card.id, path });
  }

  /** 補上目前卡片識別後，觸發刪除項目事件。 */
  onDeleteItem(payload: Omit<DeleteItemChange, 'cardId'>): void {
    this.deleteItem.emit({ cardId: this.card.id, ...payload });
  }

  /** 觸發文字元素變更事件。 */
  onTextElementChange(elementIndex: number, value: string): void {
    this.textElementChange.emit({ cardId: this.card.id, elementIndex, value });
  }

  /** 觸發徽章項目變更事件。 */
  onBadgeItemChange(elementIndex: number, itemIndex: number, value: string): void {
    this.badgeItemChange.emit({ cardId: this.card.id, elementIndex, itemIndex, value });
  }

  /** 觸發圖示清單項目變更事件。 */
  onIconListItemChange(elementIndex: number, itemIndex: number, value: string): void {
    this.iconListItemChange.emit({ cardId: this.card.id, elementIndex, itemIndex, value });
  }

  /** 觸發技術分類名稱變更事件。 */
  onTechCategoryChange(elementIndex: number, categoryIndex: number, value: string): void {
    this.techCategoryChange.emit({ cardId: this.card.id, elementIndex, categoryIndex, value });
  }

  /** 觸發分組項目文字變更事件。 */
  onTreeGroupItemChange(
    elementIndex: number,
    treeGroupIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    this.treeGroupItemChange.emit({ cardId: this.card.id, elementIndex, treeGroupIndex, itemIndex, value });
  }

  /** 觸發分組項目圖示變更事件。 */
  onTreeGroupItemIconChange(
    elementIndex: number,
    treeGroupIndex: number,
    itemIndex: number,
    icon: string,
  ): void {
    this.treeGroupItemIconChange.emit({ cardId: this.card.id, elementIndex, treeGroupIndex, itemIndex, icon });
  }

  /** 觸發分組標題變更事件。 */
  onTreeGroupNameChange(
    elementIndex: number,
    treeGroupIndex: number,
    value: string,
  ): void {
    this.treeGroupNameChange.emit({ cardId: this.card.id, elementIndex, treeGroupIndex, value });
  }

  /** 觸發分組父層圖示變更事件。 */
  onTreeGroupIconChange(
    elementIndex: number,
    treeGroupIndex: number,
    icon: string,
  ): void {
    this.treeGroupIconChange.emit({ cardId: this.card.id, elementIndex, treeGroupIndex, icon });
  }

}
