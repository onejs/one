import type { AudioStatus } from './types.js';
export type StatusReader = () => AudioStatus;
export declare function createPlayerEvents(read: StatusReader, updateIntervalMs: number): {
    add(event: string, listener: (status: AudioStatus) => void): {
        remove: () => void;
    };
    removeAll(): void;
};
//# sourceMappingURL=events.d.ts.map