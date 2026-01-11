/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/createMemoryHistory.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 *
 * Modifications:
 * - Added displayPath field to HistoryRecord for route masking support
 * - Modified push() and replace() to accept displayPath parameter for showing masked URLs in browser
 */
import type { NavigationState } from '@react-navigation/core';
type HistoryRecord = {
    id: string;
    state: NavigationState;
    path: string;
    displayPath?: string;
};
export declare function createMemoryHistory(): {
    readonly index: number;
    get(index: number): HistoryRecord;
    backIndex({ path }: {
        path: string;
    }): number;
    push({ path, state, displayPath, }: {
        path: string;
        state: NavigationState;
        displayPath?: string;
    }): void;
    replace({ path, state, displayPath, }: {
        path: string;
        state: NavigationState;
        displayPath?: string;
    }): void;
    go(n: number): Promise<void> | undefined;
    listen(listener: () => void): () => void;
};
export {};
//# sourceMappingURL=createMemoryHistory.d.ts.map