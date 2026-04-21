import { Card } from './resume.model';

export type TreeListItem = {
  value: string;
  icon: string;
  children?: TreeListItem[];
};

export type TreeGroup = {
  name: string;
  icon: string;
  items: TreeListItem[];
};

export type StackCategoryKey = 'language' | 'frontend' | 'backend' | 'database' | 'devops';

export const STACK_CATEGORY_KEYS = ['language', 'frontend', 'backend', 'database', 'devops'] as const;

export type StackCategoryValueMap = Record<StackCategoryKey, string[]>;
export type StackCategoryLabelMatchers = Record<StackCategoryKey, Set<string>>;

export type CardContentEntry = {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  name?: string;
  headline?: string;
  text?: string;
  elements?: Card['elements'];
  topics?: string[];
};

export type CardContentSection = {
  cards: CardContentEntry[];
};

