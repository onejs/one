import type { NavigationState } from '@react-navigation/core';
export default function createMemoryHistory(): {
    readonly index: number;
    get(index: number): any;
    backIndex({ path }: {
        path: string;
    }): number;
    push({ path, state }: {
        path: string;
        state: NavigationState;
    }): void;
    replace({ path, state }: {
        path: string;
        state: NavigationState;
    }): void;
    go(n: number): any;
    listen(listener: () => void): () => any;
};
//# sourceMappingURL=createMemoryHistory.d.ts.map