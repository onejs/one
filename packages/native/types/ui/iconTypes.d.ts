import type { ReactElement } from 'react';
import type { ColorValue } from 'react-native';
export declare const iconColorRoles: readonly ['primary', 'secondary', 'tertiary', 'accent', 'danger'];
export type IconColorRole = (typeof iconColorRoles)[number];
export type IconElements = Readonly<{
    ios: ReactElement;
    android: ReactElement;
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
export {};
//# sourceMappingURL=iconTypes.d.ts.map