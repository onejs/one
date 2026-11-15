export type { AppCommandBinding, AppCommandMenuItem, AppCommandMenu, AppCommandConfig, AppCommandToolbarItem, AppCommandListener } from '../desktop/appCommandTypes.js';
export declare const AppCommands: {
    configure(config: import("./AppCommands.macos.js").AppCommandConfig): void;
    addListener(listener: import("./AppCommands.macos.js").AppCommandListener): () => void;
};
export type OneMacAppCommands = typeof AppCommands;
//# sourceMappingURL=AppCommands.macos.d.ts.map