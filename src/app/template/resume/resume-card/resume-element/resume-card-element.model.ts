type ResumeTreeNode = {
  value: string;
  icon: string;
  children?: ResumeTreeNode[];
};

type ResumeCardElementBase =
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
    };

export type ResumeCardElement = ResumeCardElementBase & {
  children?: ResumeCardElement[];
};
