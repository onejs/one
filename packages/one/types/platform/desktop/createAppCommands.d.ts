import type { AppCommandConfig, AppCommandListener } from './appCommandTypes';
export declare function createAppCommands<Config extends AppCommandConfig = AppCommandConfig>(moduleName: string, eventName: string): {
    configure(config: Config): void;
    addListener(listener: AppCommandListener): () => void;
};
//# sourceMappingURL=createAppCommands.d.ts.map