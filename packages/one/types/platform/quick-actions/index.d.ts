import type { QuickActionItem } from '../specs/OneQuickActions.nitro';
export type { QuickActionItem };
declare function setItems(items: QuickActionItem[]): Promise<void>;
declare function getItems(): Promise<QuickActionItem[]>;
declare function getInitialAction(): string | null;
declare function clearInitialAction(): void;
declare function addListener(listener: (id: string) => void): () => void;
export declare const QuickActions: Readonly<{
    setItems: typeof setItems;
    getItems: typeof getItems;
    getInitialAction: typeof getInitialAction;
    clearInitialAction: typeof clearInitialAction;
    addListener: typeof addListener;
}>;
//# sourceMappingURL=index.d.ts.map