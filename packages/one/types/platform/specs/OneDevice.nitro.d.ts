import type { HybridObject } from 'react-native-nitro-modules';
export interface DeviceInfo {
    model: string;
    systemName: string;
    systemVersion: string;
    interfaceIdiom: string;
    isSimulator: boolean;
    vendorIdentifier?: string;
}
export interface OneDevice extends HybridObject<{
    ios: 'swift';
}> {
    getInfo(): Promise<DeviceInfo>;
}
//# sourceMappingURL=OneDevice.nitro.d.ts.map