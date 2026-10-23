import type { ColorValue, ViewProps } from 'react-native';
import type { SFSymbolName } from '../generated/sfSymbolNames';
export type ImageProps = Omit<ViewProps, 'children'> & {
    systemName: SFSymbolName;
    /** symbol point size, centered in a default square layout. defaults to 16. */
    size?: number;
    /** defaults to the appearance-aware AppKit label color. */
    tintColor?: ColorValue;
};
export declare function Image({ systemName, size, tintColor, accessibilityLabel, accessible, style, ...props }: ImageProps): import("react").JSX.Element;
//# sourceMappingURL=Image.macos.d.ts.map