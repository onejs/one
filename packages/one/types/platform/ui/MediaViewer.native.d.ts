import type { MediaViewerProps, MediaViewerThumbnailProps } from './mediaViewerTypes.js';
declare function Frame({ items, children, onError }: MediaViewerProps): string | number | bigint | boolean | import("react").JSX.Element | Iterable<import("react").ReactNode> | Promise<string | number | bigint | boolean | Iterable<import("react").ReactNode> | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | import("react").ReactPortal | null | undefined> | null | undefined;
declare function Thumbnail({ index, children, ...props }: MediaViewerThumbnailProps): import("react").JSX.Element;
export declare const MediaViewer: typeof Frame & {
    Thumbnail: typeof Thumbnail;
};
export type { MediaViewerItem, MediaViewerProps, MediaViewerThumbnailProps, } from './mediaViewerTypes.js';
//# sourceMappingURL=MediaViewer.native.d.ts.map