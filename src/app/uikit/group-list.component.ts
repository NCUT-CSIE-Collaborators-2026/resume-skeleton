import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

interface GroupItem {
  label: string;
  value: string;
  icon: string;
}

interface Group {
  name: string;
  icon: string;
  items: GroupItem[];
}

interface TreeNode {
  label: string;
  value: string;
  icon: string;
  children: TreeNode[];
}

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="group-list-container">
      <ul class="tree-root" [class.grid-single]="gridLayout === 'single'">
        @for (node of treeNodes; track node.label; let nodeIndex = $index) {
          <ng-container
            [ngTemplateOutlet]="treeNode"
            [ngTemplateOutletContext]="{ $implicit: node, depth: 0, key: 'root-' + nodeIndex }"
          ></ng-container>
        }
      </ul>

      <ng-template #treeNode let-node let-depth="depth" let-key="key">
        <li class="tree-node" [style.--depth]="depth">
          <div class="tree-line">
            <i [class]="node.icon"></i>
            <span class="tree-label">{{ node.value }}</span>
          </div>

          @if (node.children.length) {
            <ul class="tree-children">
              @for (child of node.children; track child.label; let childIndex = $index) {
                <ng-container
                  [ngTemplateOutlet]="treeNode"
                  [ngTemplateOutletContext]="{ $implicit: child, depth: depth + 1, key: key + '-' + childIndex }"
                ></ng-container>
              }
            </ul>
          }
        </li>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .group-list-container {
        display: flex;
        flex-direction: column;
      }

      .tree-root,
      .tree-children {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .tree-root.grid-single {
        gap: 0.45rem;
      }

      .tree-node {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .tree-line {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.35rem 0.5rem;
        border-radius: 0.5rem;
        color: #243b53;
        font-size: 0.875rem;
        line-height: 1.25;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(221, 231, 240, 0.5);
        }
      }

      .tree-line i {
        flex-shrink: 0;
        font-size: 0.95rem;
        color: #1f2937;
        width: 1rem;
        text-align: center;
      }

      .tree-label {
        word-break: break-word;
      }

      .tree-children {
        margin-left: 1.15rem;
        padding-left: 0.5rem;
        border-left: 1px dashed rgba(148, 163, 184, 0.35);
      }
    `,
  ],
})
export class GroupListComponent {
  @Input() groups: Group[] = [];
  @Input() gridLayout?: 'compact' | 'single' = 'compact';

  get treeNodes(): TreeNode[] {
    return this.groups.map((group) => ({
      label: group.name,
      value: group.name,
      icon: group.icon,
      children: group.items.map((item) => ({
        label: item.value,
        value: item.value,
        icon: item.icon,
        children: [],
      })),
    }));
  }
}
