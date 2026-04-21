import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumeCardElement, ResumeTreeNode, NodeCardItem } from './element.types';

/**
 * Tree node renderer component
 */
@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tree-node" [class.editing]="isEditing">
      @if (isEditing) {
        <input
          type="text"
          [value]="node.value"
          (change)="onValueChange($any($event.target).value)"
          class="node-value"
        />
        <input
          type="text"
          [value]="node.icon"
          (change)="onIconChange($any($event.target).value)"
          class="node-icon"
        />
      } @else {
        <i [class]="node.icon"></i>
        <span>{{ node.value }}</span>
      }
      
      @if (node.children && node.children.length > 0) {
        <ul class="tree-children">
          @for (child of node.children; track $index) {
            <li>
              <app-tree-node
                [node]="child"
                [isEditing]="isEditing"
                (nodeChange)="onNodeChange($event)"
              ></app-tree-node>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .tree-node {
      display: flex;
      flex-direction: row;
      gap: 0.25rem;
    }

    .tree-node.editing {
      flex-direction: column;
    }

    .tree-node.editing > div:first-child {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tree-node:not(.editing) > i {
      flex-shrink: 0;
      width: 1rem;
      margin-top: 0.25rem;
    }

    .tree-node:not(.editing) > span {
      flex: 1;
      min-width: 0;
      overflow-wrap: break-word;
      overflow: hidden;
    }

    .node-value, .node-icon {
      padding: 0.25rem;
      border: 1px solid #ccc;
      border-radius: 2px;
    }

    .tree-children {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
      padding-left: 1.5rem;
    }

    i {
      font-size: 1rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeNodeComponent {
  @Input({ required: true }) node!: ResumeTreeNode;
  @Input() isEditing = false;

  @Output() nodeChange = new EventEmitter<ResumeTreeNode>();

  onValueChange(value: string): void {
    this.node.value = value;
    this.nodeChange.emit(this.node);
  }

  onIconChange(icon: string): void {
    this.node.icon = icon;
    this.nodeChange.emit(this.node);
  }

  onNodeChange(node: ResumeTreeNode): void {
    this.nodeChange.emit(node);
  }
}

/**
 * Generic recursive element renderer
 * Supports all actual element types: text, badges, icon-list, grid-tree
 */
@Component({
  selector: 'app-element-renderer',
  standalone: true,
  imports: [CommonModule, TreeNodeComponent],
  template: `
    <div [class]="'element-' + (element.type || 'unknown')" [class.editing]="isEditing">
      @switch (element.type) {
        @case ('text') {
          <div class="text-element">
            @if (isEditing) {
              <textarea
                [value]="element.text"
                (change)="onElementChange(element)"
              ></textarea>
            } @else {
              <p>{{ element.text }}</p>
            }
            @if (element.children) {
              <div class="children">
                @for (child of element.children; track $index) {
                  <app-element-renderer
                    [element]="child"
                    [isEditing]="isEditing"
                    (elementChange)="onElementChange($event)"
                  ></app-element-renderer>
                }
              </div>
            }
          </div>
        }

        @case ('badges') {
          <div class="badges-element">
            <div class="badges-container">
              @for (badge of element.items; track $index) {
                <span class="badge">
                  @if (isEditing) {
                    <input
                      type="text"
                      [value]="badge"
                      (change)="onBadgeChange($index, $any($event.target).value)"
                    />
                  } @else {
                    {{ badge }}
                  }
                </span>
              }
            </div>
            @if (element.children) {
              <div class="children">
                @for (child of element.children; track $index) {
                  <app-element-renderer
                    [element]="child"
                    [isEditing]="isEditing"
                    (elementChange)="onElementChange($event)"
                  ></app-element-renderer>
                }
              </div>
            }
          </div>
        }

        @case ('icon-list') {
          <div class="icon-list-element">
            <div class="icon-list-container">
              @for (item of element.items; track $index) {
                <div class="icon-list-item">
                  @if (isEditing) {
                    <input
                      type="text"
                      [value]="element.icon"
                      (change)="onIconChange($index, $any($event.target).value)"
                      class="icon-input"
                    />
                  } @else {
                    <i [class]="element.icon"></i>
                  }
                  <span>{{ item }}</span>
                </div>
              }
            </div>
            @if (element.children) {
              <div class="children">
                @for (child of element.children; track $index) {
                  <app-element-renderer
                    [element]="child"
                    [isEditing]="isEditing"
                    (elementChange)="onElementChange($event)"
                  ></app-element-renderer>
                }
              </div>
            }
          </div>
        }

        @case ('grid-tree') {
          <div class="grid-tree-element" [class.compact]="element.gridLayout === 'compact'">
            <div class="tree-groups">
              @for (group of element.groups; track $index) {
                <div class="tree-group">
                  <div class="group-header">
                    <i [class]="group.icon" class="group-icon"></i>
                    <h4 class="group-name">
                      @if (isEditing) {
                        <input
                          type="text"
                          [value]="group.name"
                          (change)="onGroupNameChange($index, $any($event.target).value)"
                        />
                      } @else {
                        {{ group.name }}
                      }
                    </h4>
                  </div>
                  <ul class="tree-items">
                    @for (node of group.items; track $index) {
                      <li class="tree-item">
                        <app-tree-node
                          [node]="node"
                          [isEditing]="isEditing"
                          (nodeChange)="onNodeChange($index, $index, $event)"
                        ></app-tree-node>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
            @if (element.children) {
              <div class="children">
                @for (child of element.children; track $index) {
                  <app-element-renderer
                    [element]="child"
                    [isEditing]="isEditing"
                    (elementChange)="onElementChange($event)"
                  ></app-element-renderer>
                }
              </div>
            }
          </div>
        }

        @case ('node-card') {
          <div class="node-card-element">
            <div class="node-card-items">
              @for (item of element.items; track $index) {
                @switch (item.type) {
                  @case ('node') {
                    <div class="node-card-item" [class.editing]="isEditing">
                      <div class="node-item">
                        @if (isEditing) {
                          <input
                            type="text"
                            [value]="item.name"
                            (change)="onNodeCardItemNameChange($index, $any($event.target).value)"
                            placeholder="Node name"
                            class="item-name"
                          />
                        } @else {
                          <span class="item-name">{{ item.name }}</span>
                        }
                        @if (item.icon) {
                          <i [class]="item.icon" class="item-icon"></i>
                        }
                      </div>
                      @if (isEditing) {
                        <button
                          (click)="onRemoveNodeCardItem($index)"
                          class="remove-btn"
                          type="button"
                        >
                          ✕
                        </button>
                      }
                    </div>
                  }
                  @case ('badge-node') {
                    <div class="badge-node-category">
                      <h4 class="badge-category-label">
                        @if (isEditing) {
                          <input
                            type="text"
                            [value]="item.name"
                            (change)="onNodeCardItemNameChange($index, $any($event.target).value)"
                            placeholder="Category name"
                            class="category-name-input"
                          />
                        } @else {
                          {{ item.name }}
                        }
                      </h4>
                      <div class="badge-container">
                        @for (badge of item.items; track badge.name) {
                          <span class="badge" [class]="'severity-' + badge.type">
                            {{ badge.name }}
                          </span>
                        }
                      </div>
                      @if (isEditing) {
                        <button
                          (click)="onRemoveNodeCardItem($index)"
                          class="remove-btn"
                          type="button"
                        >
                          ✕
                        </button>
                      }
                    </div>
                  }
                }
              }
            </div>
            @if (isEditing) {
              <div class="add-item-buttons">
                <button
                  (click)="onAddNodeCardItem('node')"
                  class="add-btn add-node-btn"
                  type="button"
                >
                  + Add Node
                </button>
                <button
                  (click)="onAddNodeCardItem('badge-node')"
                  class="add-btn add-badge-btn"
                  type="button"
                >
                  + Add Badge Category
                </button>
              </div>
            }
            @if (element.children) {
              <div class="children">
                @for (child of element.children; track $index) {
                  <app-element-renderer
                    [element]="child"
                    [isEditing]="isEditing"
                    (elementChange)="onElementChange($event)"
                  ></app-element-renderer>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .element-text, .element-badges, .element-icon-list, .element-grid-tree {
      margin: 0.5rem 0;
      padding: 0.5rem;
    }

    .element-grid-tree {
      margin: 0;
    }

    .element-badges {
      margin: 0;
    }

    .text-element p {
      margin: 0;
      line-height: 1.6;
    }

    textarea {
      width: 100%;
      min-height: 80px;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .badges-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #f0f0f0;
      border-radius: 16px;
      font-size: 0.875rem;
    }

    .badge input {
      border: none;
      background: transparent;
      width: 100%;
    }

    .icon-list-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .icon-list-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .icon-list-item i {
      font-size: 1.25rem;
    }

    .tree-groups {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .tree-group {
      flex: 1;
      min-width: 250px;
      padding: 0.75rem;
      background: #f9f9f9;
      border-radius: 4px;
      border-left: 3px solid #1976d2;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .group-icon {
      font-size: 1.25rem;
      color: #1976d2;
    }

    .group-name {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .tree-items {
      list-style: none;
      margin: 0;
      padding: 0;
      padding-left: 1rem;
    }

    .tree-item {
      margin: 0.3rem 0;
      font-size: 0.9rem;
    }

    .tree-node {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 0.5rem;
      flex-wrap: nowrap;
      width: 100%;
      min-width: 0;
    }

    .tree-node i {
      flex-shrink: 0;
      width: 1rem;
      margin-top: 0.25rem;
    }

    .tree-node span {
      flex: 1;
      min-width: 0;
      overflow-wrap: break-word;
      overflow: hidden;
    }
    .tree-children {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
      padding-left: 1.5rem;
    }

    .children {
      margin-left: 1rem;
      border-left: 2px solid #ddd;
      padding-left: 1rem;
      margin-top: 0.5rem;
    }

    .editing {
      background: #fffacd;
      padding: 0.25rem;
      border-radius: 2px;
    }

    input {
      padding: 0.25rem;
      border: 1px solid #ccc;
      border-radius: 2px;
    }

    .node-card-element {
      padding: 0.5rem;
    }

    .badge-category-label {
      margin: 0;
    }

    .node-card-items {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .node-card-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    .node-card-item.editing {
      background: #fffacd;
    }

    .node-item, .badge-node-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .item-name, .badge-name {
      flex: 1;
      min-width: 0;
      padding: 0.25rem;
      border: 1px solid #ccc;
      border-radius: 2px;
      display: block;
      white-space: normal;
      word-break: break-word;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .item-icon {
      font-size: 1rem;
      color: #666;
      flex-shrink: 0;
      margin-top: 0.25rem;
    }

    .badge-name {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #e3f2fd;
      border-radius: 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #1976d2;
    }

    .remove-btn {
      padding: 0.25rem 0.5rem;
      background: #ffebee;
      border: 1px solid #ef5350;
      border-radius: 2px;
      color: #c62828;
      cursor: pointer;
      font-weight: 600;
    }

    .remove-btn:hover {
      background: #ef5350;
      color: white;
    }

    .add-item-buttons {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }

    .add-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #1976d2;
      border-radius: 4px;
      background: white;
      color: #1976d2;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .add-btn:hover {
      background: #1976d2;
      color: white;
    }

    .add-node-btn {
      border-color: #388e3c;
      color: #388e3c;
    }

    .add-node-btn:hover {
      background: #388e3c;
      color: white;
    }

    .add-badge-btn {
      border-color: #f57c00;
      color: #f57c00;
    }

    .add-badge-btn:hover {
      background: #f57c00;
      color: white;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElementRendererComponent {
  @Input({ required: true }) element!: ResumeCardElement;
  @Input() isEditing = false;

  @Output() elementChange = new EventEmitter<ResumeCardElement>();

  onElementChange(element: ResumeCardElement): void {
    this.elementChange.emit(element);
  }

  onBadgeChange(index: number, value: string): void {
    if (this.element.type === 'badges') {
      const updated = { ...this.element };
      updated.items[index] = value;
      this.elementChange.emit(updated as any);
    }
  }

  onIconChange(index: number, value: string): void {
    if (this.element.type === 'icon-list') {
      const updated = { ...this.element };
      updated.icon = value;
      this.elementChange.emit(updated as any);
    }
  }

  onGroupNameChange(index: number, value: string): void {
    if (this.element.type === 'grid-tree') {
      const updated = { ...this.element };
      updated.groups[index].name = value;
      this.elementChange.emit(updated as any);
    }
  }

  onNodeCardItemNameChange(index: number, value: string): void {
    if (this.element.type === 'node-card') {
      const updated = { ...this.element };
      updated.items[index] = { ...updated.items[index], name: value };
      this.elementChange.emit(updated as any);
    }
  }

  onRemoveNodeCardItem(index: number): void {
    if (this.element.type === 'node-card') {
      const updated = { ...this.element };
      updated.items.splice(index, 1);
      this.elementChange.emit(updated as any);
    }
  }

  onAddNodeCardItem(type: 'node' | 'badge-node'): void {
    if (this.element.type === 'node-card') {
      const updated = { ...this.element };
      const newItem: NodeCardItem = {
        type,
        name: type === 'node' ? 'New Node' : 'New Badge',
        icon: type === 'node' ? 'pi pi-circle' : undefined,
      };
      updated.items.push(newItem);
      this.elementChange.emit(updated as any);
    }
  }

  onNodeChange(groupIndex: number, itemIndex: number, node: ResumeTreeNode): void {
    if (this.element.type === 'grid-tree') {
      const updated = { ...this.element };
      updated.groups[groupIndex].items[itemIndex] = node;
      this.elementChange.emit(updated as any);
    }
  }
}

