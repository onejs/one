export type { AppCommandBinding, AppCommandMenuItem, AppCommandMenu, AppCommandConfig, AppCommandToolbarItem, AppCommandListener } from '../desktop/appCommandTypes';
export declare const AppCommands: {
    configure(config: import("./AppCommands.macos").AppCommandConfig): void;
    addListener(listener: import("./AppCommands.macos").AppCommandListener): () => void;
};
export type OneMacAppCommands = typeof AppCommands;
//# sourceMappingURL=AppCommands.macos.d.ts.map