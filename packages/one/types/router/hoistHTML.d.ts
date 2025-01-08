export type FoundHTML = [
    React.ReactElement | null,
    React.ReactElement | null,
    React.ReactElement | null
];
/**
 * To enable custom <html> and other html-like stuff in the root _layout
 * we are doing some fancy stuff, namely, just capturing the root layout return
 * value and deep-mapping over it.
 *
 * On server, we filter it out and hoist it to the parent root html in createApp
 *
 * On client, we just filter it out completely as in One we don't hydrate html
 */
export declare function filterRootHTML(el: React.ReactNode): [React.ReactNode, FoundHTML];
//# sourceMappingURL=hoistHTML.d.ts.map