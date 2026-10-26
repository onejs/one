import type { SFSymbolName } from '../generated/sfSymbolNames';
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
    /** native window toolbar; omitting it leaves the shell's toolbar in place. */
    toolbar?: AppCommandToolbarItem[];
};
export type AppCommandToolbarItem = {
    kind: 'flexibleSpace';
} | {
    kind: 'action';
    id: string;
    label: string;
    systemImage: SFSymbolName;
    badge?: number;
};
export type AppCommandListener = (id: string) => void;
//# sourceMappingURL=appCommandTypes.d.ts.map