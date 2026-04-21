/**
 * Tree node structure for hierarchical rendering
 */
export interface ResumeTreeNode {
  value: string;
  icon: string;
  children?: ResumeTreeNode[];
}

/**
 * Node-card sub-element types
 */
export type NodeCardItem = {
  id?: string;
  type: 'node' | 'badge-node';
  name: string;
  subtitle?: string;
  icon?: string;
  items?: NodeCardItem[];
};

/**
 * Base element types
 */
export type ResumeElementType = 
  | 'text'
  | 'badges'
  | 'icon-list'
  | 'grid-tree'
  | 'node-card';

/**
 * Element definition with discriminated union
 */
export type ResumeElement = 
  | { type: 'text'; text: string }
  | { type: 'badges'; items: string[] }
  | { type: 'icon-list'; icon: string; items: string[] }
  | {
      type: 'grid-tree';
      groups: Array<{
        name: string;
        icon: string;
        items: ResumeTreeNode[];
      }>;
      gridLayout?: 'compact' | 'single';
    }
  | {
      type: 'node-card';
      items: NodeCardItem[];
    };

/**
 * Full element type including nested children
 */
export type ResumeCardElement = ResumeElement & {
  children?: ResumeCardElement[];
};

