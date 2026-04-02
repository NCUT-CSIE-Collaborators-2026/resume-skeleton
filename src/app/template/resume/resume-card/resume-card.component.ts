import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { GroupListComponent } from '../../../uikit/group-list.component';
import { Card } from '../resume-card.model';

export interface TextElementChange {
  cardId: string;
  elementIndex: number;
  value: string;
}

export interface BadgeItemChange {
  cardId: string;
  elementIndex: number;
  itemIndex: number;
  value: string;
}

export interface IconListItemChange {
  cardId: string;
  elementIndex: number;
  itemIndex: number;
  value: string;
}

export interface TechCategoryChange {
  cardId: string;
  elementIndex: number;
  categoryIndex: number;
  value: string;
}

export interface GroupItemChange {
  cardId: string;
  elementIndex: number;
  groupIndex: number;
  itemIndex: number;
  value: string;
}

export interface CardUi {
  addLabel: string;
  deleteLabel: string;
}

export interface DeleteItemChange {
  cardId: string;
  elementIndex: number;
  itemIndex: number;
  groupIndex?: number;
  categoryIndex?: number;
}

@Component({
  selector: 'app-resume-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TextareaModule, GroupListComponent],
  templateUrl: './resume-card.component.html',
  styleUrl: './resume-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeCardComponent {
  @Input({ required: true }) card!: Card;
  @Input() isAuthenticated = false;
  @Input() isEditing = false;
  @Input() isSaving = false;
  @Input() cardUi: CardUi = { addLabel: 'Add', deleteLabel: 'Delete' };

  @Output() editAction = new EventEmitter<Card>();
  @Output() cancelEdit = new EventEmitter<string>();
  @Output() textElementChange = new EventEmitter<TextElementChange>();
  @Output() badgeItemChange = new EventEmitter<BadgeItemChange>();
  @Output() iconListItemChange = new EventEmitter<IconListItemChange>();
  @Output() techCategoryChange = new EventEmitter<TechCategoryChange>();
  @Output() groupItemChange = new EventEmitter<GroupItemChange>();
  @Output() addItem = new EventEmitter<{ cardId: string; elementIndex: number }>();
  @Output() deleteItem = new EventEmitter<DeleteItemChange>();

  onEditAction(): void {
    this.editAction.emit(this.card);
  }

  onCancelEdit(): void {
    this.cancelEdit.emit(this.card.id);
  }

  onAddItem(elementIndex: number): void {
    this.addItem.emit({ cardId: this.card.id, elementIndex });
  }

  onDeleteItem(payload: Omit<DeleteItemChange, 'cardId'>): void {
    this.deleteItem.emit({ cardId: this.card.id, ...payload });
  }

  onTextElementChange(elementIndex: number, value: string): void {
    this.textElementChange.emit({ cardId: this.card.id, elementIndex, value });
  }

  onBadgeItemChange(elementIndex: number, itemIndex: number, value: string): void {
    this.badgeItemChange.emit({ cardId: this.card.id, elementIndex, itemIndex, value });
  }

  onIconListItemChange(elementIndex: number, itemIndex: number, value: string): void {
    this.iconListItemChange.emit({ cardId: this.card.id, elementIndex, itemIndex, value });
  }

  onTechCategoryChange(elementIndex: number, categoryIndex: number, value: string): void {
    this.techCategoryChange.emit({ cardId: this.card.id, elementIndex, categoryIndex, value });
  }

  onGroupItemChange(
    elementIndex: number,
    groupIndex: number,
    itemIndex: number,
    value: string,
  ): void {
    this.groupItemChange.emit({ cardId: this.card.id, elementIndex, groupIndex, itemIndex, value });
  }

  getTechCategoryValueText(values: string[]): string {
    return values.join(', ');
  }
}
