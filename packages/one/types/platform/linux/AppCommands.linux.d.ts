import type { AppCommandConfig } from '../desktop/appCommandTypes';
export type LinuxAppCommandConfig = Omit<AppCommandConfig, 'toolbar'>;
export declare const AppCommands: {
    configure(config: LinuxAppCommandConfig): void;
    addListener(listener: import("../desktop/appCommandTypes").AppCommandListener): () => void;
};
export type OneLinuxAppCommands = typeof AppCommands;
//# sourceMappingURL=AppCommands.linux.d.ts.map