import type { TurboModule } from 'react-native';
export interface Spec extends TurboModule {
    load(name: string, uri: string): Promise<void>;
    isLoaded(name: string): boolean;
}
//# sourceMappingURL=OneNativeFontsNativeModule.d.ts.map