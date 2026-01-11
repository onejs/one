/**
 * Scroll Position Groups allow layouts to preserve their scroll position
 * independently of child route changes. This is useful for:
 * - Tab layouts where switching tabs shouldn't reset parent scroll
 * - Side panels where main content scroll is preserved
 * - Any nested layout that wants independent scroll restoration
 */
export declare function registerScrollGroup(groupId: string): () => void;
type ScrollBehaviorProps = {
    disable?: boolean | 'restore';
};
export declare function ScrollBehavior(props: ScrollBehaviorProps): null;
export {};
//# sourceMappingURL=ScrollBehavior.d.ts.map