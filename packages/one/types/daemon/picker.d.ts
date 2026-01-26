import type { ServerRegistration } from './types';
interface PickerContext {
    bundleId: string;
    servers: ServerRegistration[];
    onSelect: (server: ServerRegistration, remember: boolean) => void;
    onCancel: () => void;
}
export declare function getBootedSimulators(): Promise<{
    name: string;
    udid: string;
    state: string;
    iosVersion?: string;
}[]>;
export declare function showPicker(context: PickerContext): void;
export declare function resolvePendingPicker(bundleId: string, serverId: string): boolean;
export declare function pickServer(bundleId: string, servers: ServerRegistration[]): Promise<{
    server: ServerRegistration;
    remember: boolean;
}>;
export {};
//# sourceMappingURL=picker.d.ts.map