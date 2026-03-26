import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GroupItem {
  label: string;
  value: string;
  icon: string;
}

interface Group {
  name: string;
  items: GroupItem[];
}

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="group-list-container">
      @for (group of groups; track group.name) {
        <ul class="group-list" [class.grid-single]="gridLayout === 'single'">
          @for (item of group.items; track item.label) {
            <li class="group-item">
              <i [class]="item.icon"></i>
              <span class="group-value">{{ item.value }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .group-list-container {
      display: flex;
      flex-direction: column;
    }

    .group-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.25rem;
      list-style: none;
      padding: 0.5rem;
      margin: 0;
      border-radius: 0.5rem;
      background: transparent;
      border: none;
      box-shadow: none;
      transition: all 0.5s ease;

      &:hover {
        background: rgba(221, 231, 240, 0.69);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      &.grid-single {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
    }

    .group-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0;
      transition: all 0.2s ease;
      font-size: 0.875rem;

      i {
        flex-shrink: 0;
        font-size: 1rem;
        color: #1f2937;
        width: 1.25rem;
        text-align: center;
      }

      .group-value {
        font-size: 0.875rem;
        line-height: 1.2;
      }
    }
  `]
})
export class GroupListComponent {
  @Input() groups: Group[] = [];
  @Input() gridLayout?: 'compact' | 'single' = 'compact';
}
