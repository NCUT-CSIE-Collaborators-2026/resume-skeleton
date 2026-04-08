/** 文字元素編輯事件資料。 */
export interface TextElementChange {
  cardId: string;
  elementIndex: number;
  value: string;
}

/** 徽章項目編輯事件資料。 */
export interface BadgeItemChange {
  cardId: string;
  elementIndex: number;
  itemIndex: number;
  value: string;
}

/** 圖示清單項目編輯事件資料。 */
export interface IconListItemChange {
  cardId: string;
  elementIndex: number;
  itemIndex: number;
  value: string;
}

/** 技術分類編輯事件資料。 */
export interface TechCategoryChange {
  cardId: string;
  elementIndex: number;
  categoryIndex: number;
  value: string;
}

/** 分組項目編輯事件資料。 */
export interface GroupItemChange {
  cardId: string;
  elementIndex: number;
  groupIndex: number;
  itemIndex: number;
  value: string;
}

/** 分組項目圖示編輯事件資料。 */
export interface GroupItemIconChange {
  cardId: string;
  elementIndex: number;
  groupIndex: number;
  itemIndex: number;
  icon: string;
}

/** 分組標題編輯事件資料。 */
export interface GroupNameChange {
  cardId: string;
  elementIndex: number;
  groupIndex: number;
  value: string;
}

/** 分組父層圖示編輯事件資料。 */
export interface GroupIconChange {
  cardId: string;
  elementIndex: number;
  groupIndex: number;
  icon: string;
}

/** 卡片介面顯示設定。 */
export interface CardUi {
  addLabel: string;
}

/** 新增樹節點事件資料。 */
export interface AddItemChange {
  cardId: string;
  path: number[];
}

/** 刪除項目事件資料。 */
export interface DeleteItemChange {
  cardId: string;
  elementIndex: number;
  itemIndex: number;
  groupIndex?: number;
  categoryIndex?: number;
}
