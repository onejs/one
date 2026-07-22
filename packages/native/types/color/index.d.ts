import type { ColorValue } from 'react-native';
import type { AndroidDynamicMaterialColorType } from './android.dynamic.types';
import type { AndroidStaticMaterialColorType } from './android.material.types';
import type { IOSBaseColor } from './ios.types';
export * from './android.dynamic.types';
export * from './android.material.types';
export * from './ios.types';
export type AndroidMaterialColor = AndroidStaticMaterialColorType & {
    [key: string]: ColorValue;
};
export type AndroidDynamicMaterialColor = AndroidDynamicMaterialColorType & {
    [key: string]: ColorValue;
};
export interface ColorType {
    ios: IOSBaseColor & {
        [key: string]: ColorValue;
    };
    android: {
        material: AndroidMaterialColor;
        dynamic: AndroidDynamicMaterialColor;
        [key: string]: any;
    };
}
export declare const Color: ColorType;
//# sourceMappingURL=index.d.ts.map