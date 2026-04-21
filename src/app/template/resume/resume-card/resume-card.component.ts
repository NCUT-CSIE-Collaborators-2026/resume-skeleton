import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Card } from '../resume.model';
import { ElementRendererComponent } from './element-renderer.component';
import { ResumeCardElement } from './element.types';

@Component({
  selector: 'app-resume-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, ElementRendererComponent],
  templateUrl: './resume-card.component.html',
  styleUrl: './resume-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeCardComponent {
  @Input({ required: true }) card!: Card;
  @Input() isAuthenticated = false;
  @Input() isEditing = false;

  @Output() editAction = new EventEmitter<Card>();
  @Output() cancelEdit = new EventEmitter<string>();
  @Output() elementChange = new EventEmitter<ResumeCardElement>();

  onEditAction(): void {
    this.editAction.emit(this.card);
  }

  onCancelEdit(): void {
    this.cancelEdit.emit(this.card.id);
  }

  onElementChange(element: ResumeCardElement): void {
    this.elementChange.emit(element);
  }
}
