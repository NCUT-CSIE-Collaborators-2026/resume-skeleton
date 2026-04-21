import { Card } from './resume.model';
import {
  CardContentEntry,
  TreeGroup,
  TreeListItem,
  StackCategoryLabelMatchers,
  StackCategoryKey,
  StackCategoryValueMap,
  STACK_CATEGORY_KEYS,
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

    const byId = new Map<string, ResumeNode>();
    const cards: CardContentEntry[] = [];

    sourceNodes.forEach((node, index) => {
      if (node.id && !byId.has(node.id)) {
        byId.set(node.id, node);
      }

      if (node.type === 'headline') {
        return;
      }

      const cardEntry = this.toCardEntry(node, index, byId);
      if (cardEntry) {
        cards.push(cardEntry);
      }
    });

    const stackLabelMatchers = this.buildStackCategoryLabelMatchers(emptyContentLocale);

    const header = sourceNodes.find((node) => node.type === 'headline') ?? null;
    const profileNode = byId.get('profile') ?? sourceNodes.find((node) => node.type === 'badge-card') ?? null;
    const educationNode = byId.get('education') ?? sourceNodes.find((node) => node.name === '學歷背景') ?? null;
    const experienceNode = byId.get('experience') ?? sourceNodes.find((node) => node.name === '經歷概覽') ?? null;
    const skillsNode = byId.get('skills') ?? sourceNodes.find((node) => node.name === '技術堆疊') ?? null;
    const projectsNode = byId.get('projects') ?? sourceNodes.find((node) => node.name === '專案') ?? null;
    const verifyNode = byId.get('verify') ?? sourceNodes.find((node) => node.name === '專業證照') ?? null;
    const introductionNode = byId.get('introduction') ?? sourceNodes.find((node) => node.type === 'toggle-card') ?? null;

    return {
      profile: this.buildProfileSection(header, profileNode, emptyContentLocale['profile']),
      education: this.buildEducationSection(this.nodeToTreeGroups(educationNode), emptyContentLocale['education']),
      experience: this.buildExperienceSection(this.nodeToTreeGroups(experienceNode), emptyContentLocale['experience']),
      tech_stack: this.buildStackSection(skillsNode, stackLabelMatchers, emptyContentLocale['tech_stack']),
      introductions: this.buildIntroductionsSection(introductionNode, emptyContentLocale['introductions']),
      projects: this.buildProjectsSection(projectsNode, emptyContentLocale['projects']),
      verify: this.buildVerifySection(verifyNode, emptyContentLocale['verify']),
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

        if (type === 'grid-tech') {
          nextElement['items'] = this.normalizeGridTechItems(elementRecord['items']);
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
        type: 'grid-tech',
        items: this.stackNodeToTechItems(node),
        gridLayout: 'compact',
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

  private buildProfileSection(
    headerNode: ResumeNode | null,
    profileNode: ResumeNode | null,
    fallback: SectionPayload,
  ): SectionPayload {
    const badges = (profileNode?.items ?? []).map((item) => item.name);
    return {
      ...fallback,
      name: headerNode?.name ?? fallback['name'] ?? '',
      title: headerNode?.items?.[0]?.name ?? fallback['title'] ?? '',
      status: badges[0] ?? '',
      gender: badges[1] ?? '',
      age: badges[2] ?? '',
      mbti: badges[3] ?? '',
    };
  }

  private buildEducationSection(groups: TreeGroup[], fallback: SectionPayload): SectionPayload {
    return {
      ...fallback,
      school: this.readTreeGroupName(groups, 0) ?? this.readTreeGroupItemValue(groups, 0, 0) ?? '',
      department: this.readTreeGroupItemValue(groups, 0, 0) ?? '',
      degree: this.readTreeGroupItemValue(groups, 0, 1) ?? '',
      graduation_status: this.readTreeGroupItemValue(groups, 0, 2) ?? '',
    };
  }

  private buildExperienceSection(groups: TreeGroup[], fallback: SectionPayload): SectionPayload {
    return {
      ...fallback,
      intern_title: this.readTreeGroupItemValue(groups, 0, 0) ?? '',
      assistant_title: this.readTreeGroupItemValue(groups, 1, 0) ?? '',
      military_title: this.readTreeGroupItemValue(groups, 2, 0) ?? '',
    };
  }

  private buildStackSection(
    stackNode: ResumeNode | null,
    labelMatchers: StackCategoryLabelMatchers,
    fallback: SectionPayload,
  ): SectionPayload {
    const next: StackCategoryValueMap = {
      language: [],
      frontend: [],
      backend: [],
      database: [],
      devops: [],
    };

    (stackNode?.items ?? []).forEach((category) => {
      const key = this.matchStackCategoryKey(category.name, labelMatchers);
      if (!key) {
        return;
      }

      next[key] = (category.items ?? []).map((item) => item.name).filter((item) => item.trim().length > 0);
    });

    return {
      ...fallback,
      ...next,
    };
  }

  private buildIntroductionsSection(introductionNode: ResumeNode | null, fallback: SectionPayload): SectionPayload {
    const intro30 = introductionNode?.items?.find((item) => item.name === '30')?.items?.[0]?.name ?? '';
    const intro60 = introductionNode?.items?.find((item) => item.name === '60')?.items?.[0]?.name ?? '';

    return {
      ...fallback,
      pitch_30s: intro30,
      pitch_1min: intro60,
    };
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

  private buildProjectsSection(projectsNode: ResumeNode | null, fallback: SectionPayload): SectionPayload {
    const groups = this.nodeToTreeGroups(projectsNode);
    const items = groups.flatMap((group) => group.items.map((item) => item.value));
    return {
      ...fallback,
      items,
      groups,
    };
  }

  private buildVerifySection(verifyNode: ResumeNode | null, fallback: SectionPayload): SectionPayload {
    const groups = this.nodeToTreeGroups(verifyNode);
    const items = groups.map((group) => [group.name, ...group.items.map((item) => item.value)].join(' | '));
    return {
      ...fallback,
      items,
    };
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

  private normalizeGridTechItems(rawItems: unknown): Array<{ label: string; value: string[]; severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary' }> {
    if (!Array.isArray(rawItems)) {
      return [];
    }

    return rawItems
      .map((item) => {
        const itemRecord = this.asRecord(item);
        if (!itemRecord) {
          return null;
        }

        const label = this.readNonEmptyString(itemRecord['label']) ?? '';
        const value = this.normalizeStringArray(itemRecord['value'], []);
        const severity = this.readSeverity(itemRecord['severity']);

        if (!label) {
          return null;
        }

        return { label, value, severity };
      })
      .filter((item): item is { label: string; value: string[]; severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary' } => item !== null);
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

  private buildStackCategoryLabelMatchers(source: SectionPayload): StackCategoryLabelMatchers {
    const contentUi = this.asRecord(source['content-ui']);
    const labels = contentUi ? this.asRecord(contentUi['labels']) : null;

    return STACK_CATEGORY_KEYS.reduce<StackCategoryLabelMatchers>((acc, key) => {
      const candidates = new Set<string>();
      candidates.add(key.toLowerCase());
      const localized = labels ? this.readNonEmptyString(labels[key]) : null;
      if (localized) {
        candidates.add(localized.toLowerCase());
      }
      acc[key] = candidates;
      return acc;
    }, {
      language: new Set<string>(),
      frontend: new Set<string>(),
      backend: new Set<string>(),
      database: new Set<string>(),
      devops: new Set<string>(),
    });
  }

  private matchStackCategoryKey(label: string, matchers: StackCategoryLabelMatchers): StackCategoryKey | null {
    const normalized = label.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const found = STACK_CATEGORY_KEYS.find((key) => matchers[key].has(normalized));
    return found ?? null;
  }

  private stackNodeToTechItems(node: ResumeNode): Array<{ label: string; value: string[]; severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary' }> {
    return (node.items ?? [])
      .map((category) => {
        const values = (category.items ?? []).map((item) => item.name).filter((name) => name.trim().length > 0);
        const firstType = category.items?.[0]?.type ?? 'secondary';
        const severity = this.readSeverity(firstType);

        if (!category.name || values.length === 0) {
          return null;
        }

        return {
          label: category.name,
          value: values,
          severity,
        };
      })
      .filter((item): item is { label: string; value: string[]; severity: 'info' | 'success' | 'warning' | 'danger' | 'secondary' } => item !== null);
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

  private readTreeGroupName(groups: TreeGroup[], groupIndex: number): string | null {
    const group = groups[groupIndex];
    if (!group) {
      return null;
    }

    return group.name && group.name.trim().length > 0 ? group.name : null;
  }

  private readTreeGroupItemValue(groups: TreeGroup[], groupIndex: number, itemIndex: number): string | null {
    const group = groups[groupIndex];
    if (!group || !group.items[itemIndex]) {
      return null;
    }

    const value = group.items[itemIndex].value;
    return value && value.trim().length > 0 ? value : null;
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
