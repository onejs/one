import type { HybridObject } from 'react-native-nitro-modules';
export interface OneClipboard extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getString(): Promise<string>;
    setString(text: string): Promise<boolean>;
    hasString(): Promise<boolean>;
}
//# sourceMappingURL=OneClipboard.nitro.d.ts.map