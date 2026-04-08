type ResumeCardElementBase =
  | { type: 'text'; text: string }
  | { type: 'badges'; items: string[] }
  | { type: 'icon-list'; icon: string; items: string[] }
  | {
      type: 'grid-tech';
      items: Array<{
        label: string;
        value: string[];
        severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary';
      }>;
      gridLayout?: 'compact' | 'single';
    }
  | {
      type: 'grid-education';
      groups: Array<{
        name: string;
        icon: string;
        items: Array<{ label: string; value: string; icon: string }>;
      }>;
      gridLayout?: 'compact' | 'single';
    }
  | {
      type: 'grid-groups';
      groups: Array<{
        name: string;
        icon: string;
        items: Array<{ label: string; value: string; icon: string }>;
      }>;
      gridLayout?: 'compact' | 'single';
    };

export type ResumeCardElement = ResumeCardElementBase & {
  children?: ResumeCardElement[];
};
