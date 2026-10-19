/**
 * The One DevTools plugin API.
 *
 * A plugin is a module with a default export describing panels and actions.
 * Add the module to `devtools.plugins` in your `one()` config and One loads it
 * into the devtools panel. The same shape is intentionally close to Rozenite's
 * plugin config so a panel package can target both hosts without a second
 * abstraction.
 *
 * @example
 * ```ts
 * // devtools/runtime-inspector.ts
 * import { defineDevtoolsPlugin } from 'one/devtools'
 *
 * export default defineDevtoolsPlugin({
 *   name: 'runtime-inspector',
 *   title: 'Runtime Inspector',
 *   panel: { url: 'http://localhost:4577' },
 * })
 * ```
 */
export type OneDevtoolsPanelContext = {
    /** The panel id, namespaced as `plugin:<name>`. */
    id: string;
    /** The directory name of the app, useful for labels. */
    project: string;
    /** The URL of the app page being inspected. */
    url: string;
    /** Open a panel by id, including the built in `seo`, `route`, `loader` and `errors` panels. */
    openPanel: (id: string) => void;
    /** Close the devtools panel. */
    closePanel: () => void;
};
export type OneDevtoolsActionContext = OneDevtoolsPanelContext;
export type OneDevtoolsPanel = {
    /**
     * Load a page in the panel. The page keeps its own devtools UI and talks
     * to its own server, which is how most existing devtools already work.
     */
    url: string | ((context: OneDevtoolsPanelContext) => string | Promise<string>);
    /** Optional title for the iframe document. */
    title?: string;
} | {
    /**
     * Mount a browser panel directly into the devtools window. Return a
     * cleanup function to release listeners and timers when the panel closes.
     */
    mount: (root: HTMLElement, context: OneDevtoolsPanelContext) => void | (() => void) | Promise<void | (() => void)>;
};
export type OneDevtoolsAction = {
    /** Unique action id within the plugin, shown in the spotlight. */
    id: string;
    /** Label shown in the spotlight. */
    title?: string;
    /** Group shown above the action in the spotlight. Defaults to `Actions`. */
    category?: string;
    run: (context: OneDevtoolsActionContext) => void | Promise<void>;
};
export type OneDevtoolsPlugin = {
    /**
     * Stable plugin id. It namespaces panels and actions, so changing it is a
     * breaking change for anything that deep links to the plugin.
     */
    name: string;
    /** Human readable name. Defaults to `name`. */
    title?: string;
    /** Category used in the spotlight. Defaults to `Plugins`. */
    category?: string;
    panel?: OneDevtoolsPanel;
    actions?: OneDevtoolsAction[];
};
/** Identity helper that gives editors the plugin shape without a cast. */
export declare function defineDevtoolsPlugin(plugin: OneDevtoolsPlugin): OneDevtoolsPlugin;
//# sourceMappingURL=index.d.ts.map