export type AppCommandBinding = {
    id: string;
    /** a gpui keystroke such as cmd-shift-[, ctrl-tab or up. */
    key: string;
    /** a gpui key context; the mac host sets only Input, while a text input has focus. */
    context?: string | null;
};
export type AppCommandMenuItem = {
    kind: 'action';
    id: string;
    label: string;
} | {
    kind: 'separator';
} | {
    kind: 'submenu';
    label: string;
    items: AppCommandMenuItem[];
};
export type AppCommandMenu = {
    label: string;
    items: AppCommandMenuItem[];
};
export type AppCommandConfig = {
    bindings: AppCommandBinding[];
    /** the first menu joins the application menu; others join a menu with the same title. */
    menus: AppCommandMenu[];
};
export type AppCommandListener = (id: string) => void;
export declare const AppCommands: {
    /** replaces the menus and keys of the previous call; throws for an invalid config. */
    configure(config: AppCommandConfig): void;
    /** commands reach listeners only while one is registered; returns the remover. */
    addListener(listener: AppCommandListener): () => void;
};
export type OneMacAppCommands = typeof AppCommands;
//# sourceMappingURL=AppCommands.macos.d.ts.map