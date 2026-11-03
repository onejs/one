import type { ViewProps } from 'react-native';
export type MaterialName = 'sidebar' | 'content' | 'headerView' | 'menu' | 'underWindow' | 'window'
/** Liquid Glass (macOS 26 and later); older systems draw the sidebar material. */
 | 'glass' | 'glassClear';
export type MaterialProps = Omit<ViewProps, 'children' | 'pointerEvents'> & {
    /** which system material fills the view. Defaults to `sidebar`. */
    material?: MaterialName;
    /** `behindWindow` blurs the desktop and other windows; `withinWindow` blurs this window's own content. */
    blending?: 'behindWindow' | 'withinWindow';
    cornerRadius?: number;
};
/**
 * A native system material or Liquid Glass drawn behind a region. It has no
 * children: place it absolutely as a sibling before the content it backs, as
 * Finder's sidebar sits behind its list. It never takes pointer input.
 */
export declare function Material(props: MaterialProps): import("react").JSX.Element;
//# sourceMappingURL=Material.macos.d.ts.map