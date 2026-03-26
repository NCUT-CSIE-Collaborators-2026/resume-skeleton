import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'grid-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <h3 class="card-title">{{ title }}</h3>
      <div class="grid-container">
        @if (contentTemplate) {
          <ng-container *ngTemplateOutlet="contentTemplate; context: contentContext"></ng-container>
        } @else {
          <ng-content></ng-content>
        }
      </div>
    </div>
  `,
  styles: [`
    .card {
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 0.75rem;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      }
    }

    .card-title {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .grid-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  `]
})
export class GridCardComponent {
  @Input() title: string = '';
  @Input() contentTemplate?: TemplateRef<any>;
  @Input() contentContext: any;
}
