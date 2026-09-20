import type { ColorValue } from 'react-native';
import type { IconProps } from './iconTypes';
type ResponsiveIconProps = {
    colorRole?: string;
    swiftStyle?: Readonly<Record<string, unknown>> & {
        foregroundStyle?: ColorValue;
    };
};
export declare function Icon({ icons, colorRole, color }: IconProps): import("react").ReactElement<ResponsiveIconProps, string | import("react").JSXElementConstructor<any>>;
export type { IconColorRole, IconElements, IconProps } from './iconTypes';
//# sourceMappingURL=Icon.ios.d.ts.map