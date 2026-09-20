import type { ColorValue } from 'react-native';
import type { IconProps } from './iconTypes';
type ResponsiveIconProps = {
    colorRole?: string;
    composeStyle?: Readonly<Record<string, unknown>> & {
        foregroundColor?: ColorValue;
    };
};
export declare function Icon({ icons, colorRole, color }: IconProps): import("react").ReactElement<ResponsiveIconProps, string | import("react").JSXElementConstructor<any>>;
export type { IconColorRole, IconElements, IconProps } from './iconTypes';
//# sourceMappingURL=Icon.android.d.ts.map