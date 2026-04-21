import { Card } from './resume.model';
import {
  CardContentEntry,
  TreeGroup,
  TreeListItem
} from './resume-content.types';

type IntroMode = '30' | '60';
type UnknownRecord = Record<string, unknown>;
type SectionPayload = Record<string, any>;

type ResumeNode = {
  id?: string;
  type: string;
  name: string;
  subtitle?: string;
  icon?: string;
  items?: ResumeNode[];
};

const STACK_SEVERITY = new Set(['info', 'success', 'warning', 'danger', 'secondary']);

export class ResumeContentNormalizer {
  constructor(private readonly introModeProvider: () => IntroMode) {}

  normalizeContentLocale(raw: unknown, emptyContentLocale: SectionPayload): SectionPayload {
    if (!Array.isArray(raw)) {
      throw new Error('Invalid content payload: expected node array');
    }

    const sourceNodes = raw
      .map((item) => this.asNode(item))
      .filter((item): item is ResumeNode => item !== null);

    const cards: CardContentEntry[] = [];

    sourceNodes.forEach((node, index) => {
      const cardEntry = this.toCardEntry(node, index, new Map());
      if (cardEntry) {
        cards.push(cardEntry);
      }
    });

    return {
      card_content: {
        cards,
      },
    };
  }

  normalizeStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
      return [...fallback];
    }

    const seen = new Set<string>();
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => {
        if (item.length === 0 || seen.has(item)) {
          return false;
        }

        seen.add(item);
        return true;
      });
  }

  sanitizeCardElements(elements: Card['elements']): Card['elements'] {
    return elements
      .map((element) => {
        const elementRecord = this.asRecord(element);
        if (!elementRecord) {
          return null;
        }

        const type = this.readNonEmptyString(elementRecord['type']) ?? '';
        const nextElement: UnknownRecord = {
          ...elementRecord,
          type,
        };

        if (type === 'grid-tree') {
          nextElement['groups'] = this.normalizeTreeGroups(elementRecord['groups']);
        }

        if (type === 'icon-list' || type === 'badges') {
          nextElement['items'] = this.normalizeStringArray(elementRecord['items'], []);
        }

        if (type === 'text') {
          nextElement['text'] = this.readNonEmptyString(elementRecord['text']) ?? '';
        }

        return nextElement as Card['elements'][number];
      })
      .filter((element): element is Card['elements'][number] => element !== null);
  }

  private toCardEntry(
    node: ResumeNode,
    index: number,
    byId: Map<string, ResumeNode>,
  ): CardContentEntry | null {
    const fallbackId = this.makeCardId(node, index);
    const cardId = node.id ?? fallbackId;

    if (byId.has(cardId) && node.id === undefined) {
      return null;
    }

    // headline 類型：從 items[0].name 提取副標題
    if (node.type === 'headline') {
      const jobTitle = (node.items ?? [])[0]?.name ?? '';
      return {
        id: cardId,
        type: 'headline',
        title: node.name,
        subtitle: jobTitle,
      };
    }

    const elements = this.nodeToCardElements(node);
    if (elements.length === 0) {
      return null;
    }

    return {
      id: cardId,
      type: node.type,
      title: node.name,
      subtitle: node.subtitle,
      elements,
    };
  }

  private nodeToCardElements(node: ResumeNode): Card['elements'] {
    if (node.type === 'toggle-card') {
      const text = this.resolveToggleCardText(node);
      return [{ type: 'text', text }];
    }

    if (node.type === 'text-card') {
      const text = node.items?.find((item) => item.type === 'text')?.name ?? '';
      return [{ type: 'text', text }];
    }

    if (node.type === 'badge-card') {
      const items = (node.items ?? []).map((item) => item.name).filter((name) => name.trim().length > 0);
      return [{ type: 'badges', items }];
    }

    if (this.isStackCard(node)) {
      return [{
        type: 'node-card',
        items: (node.items ?? []) as any,
      }];
    }

    const groups = this.nodeToTreeGroups(node);
    if (groups.length === 0) {
      return [];
    }

    return [{
      type: 'grid-tree',
      groups,
      gridLayout: this.resolveTreeLayout(node),
    }];
  }

  private resolveTreeLayout(node: ResumeNode): 'compact' | 'single' {
    const count = node.items?.length ?? 0;
    return count > 1 ? 'single' : 'compact';
  }

  private resolveToggleCardText(node: ResumeNode): string {
    const mode = this.introModeProvider();
    const toggles = node.items ?? [];
    const toggle30 = toggles.find((item) => item.name === '30');
    const toggle60 = toggles.find((item) => item.name === '60');

    // Keep default behavior aligned with fragment parsing: default to 60.
    switch (mode) {
      case '30':
        return toggle30?.items?.[0]?.name ?? toggle60?.items?.[0]?.name ?? '';
      case '60':
      default:
        return toggle60?.items?.[0]?.name ?? toggle30?.items?.[0]?.name ?? '';
    }
  }

  private nodeToTreeGroups(node: ResumeNode | null): TreeGroup[] {
    if (!node) {
      return [];
    }

    return (node.items ?? [])
      .map((group) => ({
        name: group.name,
        icon: group.icon ?? 'pi pi-folder-open',
        items: this.nodeChildrenToTreeItems(group.items ?? []),
      }))
      .filter((group) => group.name.trim().length > 0);
  }

  private nodeChildrenToTreeItems(nodes: ResumeNode[]): TreeListItem[] {
    return nodes
      .map((node) => ({
        value: node.name,
        icon: node.icon ?? 'pi pi-circle',
        children: this.nodeChildrenToTreeItems(node.items ?? []),
      }))
      .map((item) => ({
        ...item,
        ...(item.children && item.children.length > 0 ? {} : { children: undefined }),
      }));
  }


  private normalizeTreeGroups(rawGroups: unknown): TreeGroup[] {
    if (!Array.isArray(rawGroups)) {
      return [];
    }

    return rawGroups
      .map((group) => {
        const groupRecord = this.asRecord(group);
        if (!groupRecord) {
          return null;
        }

        return {
          name: this.readNonEmptyString(groupRecord['name']) ?? '',
          icon: this.readNonEmptyString(groupRecord['icon']) ?? 'pi pi-folder-open',
          items: this.normalizeTreeItems(groupRecord['items']),
        };
      })
      .filter((group): group is TreeGroup => group !== null);
  }

  private normalizeTreeItems(rawItems: unknown): TreeListItem[] {
    if (!Array.isArray(rawItems)) {
      return [];
    }

    return rawItems
      .map((item) => {
        const itemRecord = this.asRecord(item);
        if (!itemRecord) {
          return null;
        }

        const children = this.normalizeTreeItems(itemRecord['children']);
        return {
          value: this.readNonEmptyString(itemRecord['value']) ?? '',
          icon: this.readNonEmptyString(itemRecord['icon']) ?? 'pi pi-circle',
          ...(children.length > 0 ? { children } : {}),
        };
      })
      .filter((item): item is TreeListItem => item !== null);
  }



  private isStackCard(node: ResumeNode): boolean {
    return node.id === 'skills' || (node.items ?? []).every((item) => item.type === 'badge-node');
  }

  private readSeverity(value: unknown): 'info' | 'success' | 'warning' | 'danger' | 'secondary' {
    if (typeof value !== 'string') {
      return 'secondary';
    }

    return STACK_SEVERITY.has(value) ? (value as 'info' | 'success' | 'warning' | 'danger' | 'secondary') : 'secondary';
  }

  private makeCardId(node: ResumeNode, index: number): string {
    const base = node.name
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return base.length > 0 ? base : `card_${index + 1}`;
  }

  private asNode(value: unknown): ResumeNode | null {
    const record = this.asRecord(value);
    if (!record) {
      return null;
    }

    const type = this.readNonEmptyString(record['type']);
    const name = this.readNonEmptyString(record['name']);
    if (!type || !name) {
      return null;
    }

    const id = this.readNonEmptyString(record['id']) ?? undefined;
    const subtitle = this.readNonEmptyString(record['subtitle']) ?? undefined;
    const icon = this.readNonEmptyString(record['icon']) ?? undefined;
    const items = Array.isArray(record['items'])
      ? record['items']
          .map((item) => this.asNode(item))
          .filter((item): item is ResumeNode => item !== null)
      : undefined;

    return {
      ...(id ? { id } : {}),
      type,
      name,
      ...(subtitle ? { subtitle } : {}),
      ...(icon ? { icon } : {}),
      ...(items && items.length > 0 ? { items } : {}),
    };
  }

  private asRecord(value: unknown): UnknownRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as UnknownRecord)
      : null;
  }

  private readNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
