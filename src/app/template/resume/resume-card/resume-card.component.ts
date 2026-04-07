import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
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

export interface GroupItemIconChange {
  cardId: string;
  elementIndex: number;
  groupIndex: number;
  itemIndex: number;
  icon: string;
}

export interface CardUi {
  addLabel: string;
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
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, InputTextModule, TextareaModule, GroupListComponent],
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
  @Output() groupItemChange = new EventEmitter<GroupItemChange>();
  @Output() groupItemIconChange = new EventEmitter<GroupItemIconChange>();
  @Output() addItem = new EventEmitter<{ cardId: string; elementIndex: number }>();
  @Output() deleteItem = new EventEmitter<DeleteItemChange>();

  readonly iconOptions: Array<{ icon: string; label: string }> = [
    { icon: 'pi pi-circle', label: 'Circle' },
    { icon: 'pi pi-check-circle', label: 'Check Circle' },
    { icon: 'pi pi-star', label: 'Star' },
    { icon: 'pi pi-heart', label: 'Heart' },
    { icon: 'pi pi-book', label: 'Book' },
    { icon: 'pi pi-briefcase', label: 'Briefcase' },
    { icon: 'pi pi-building-columns', label: 'Building' },
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

  getIconLabel(icon: string | null | undefined): string {
    if (!icon) {
      return '';
    }

    return this.iconOptions.find((option) => option.icon === icon)?.label ?? icon;
  }

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

  isCardItemPendingDelete(
    elementIndex: number,
    itemIndex: number,
    groupIndex?: number,
    categoryIndex?: number,
  ): boolean {
    return this.pendingDeleteItemKeys?.has(
      this.getPendingDeleteItemKey(elementIndex, itemIndex, groupIndex, categoryIndex),
    ) ?? false;
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

  onGroupItemIconChange(
    elementIndex: number,
    groupIndex: number,
    itemIndex: number,
    icon: string,
  ): void {
    this.groupItemIconChange.emit({ cardId: this.card.id, elementIndex, groupIndex, itemIndex, icon });
  }

  getTechCategoryValueText(values: string[]): string {
    return values.join(', ');
  }

  private getPendingDeleteItemKey(
    elementIndex: number,
    itemIndex: number,
    groupIndex?: number,
    categoryIndex?: number,
  ): string {
    if (typeof categoryIndex === 'number') {
      return `${elementIndex}:category:${categoryIndex}`;
    }

    if (typeof groupIndex === 'number') {
      return `${elementIndex}:group:${groupIndex}:${itemIndex}`;
    }

    return `${elementIndex}:item:${itemIndex}`;
  }
}
