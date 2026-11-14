import type { ReactElement } from 'react';
import type { ColorValue } from 'react-native';
import type { ComposeIconProps } from '../composeTypes.js';
import type { ImageProps } from '../generated/controlTypes.js';
import type { IconColorRole } from './iconRoles.js';
export { iconColorRoles, type IconColorRole } from './iconRoles.js';
export type IconElements = Readonly<{
    ios: ReactElement<ImageProps>;
    android: ReactElement<ComposeIconProps>;
    web?: ReactElement;
}>;
type IconColor = {
    colorRole?: IconColorRole;
    color?: never;
} | {
    color?: ColorValue;
    colorRole?: never;
};
export type IconProps = IconColor & {
    icons: IconElements;
};
//# sourceMappingURL=iconTypes.d.ts.map