export { metroPlugin } from './plugins/metroPlugin';
export type { MetroPluginOptions } from './plugins/metroPlugin';
export { expoManifestRequestHandlerPlugin } from './plugins/expoManifestRequestHandlerPlugin';
export type { ExpoManifestRequestHandlerPluginPluginOptions } from './plugins/expoManifestRequestHandlerPlugin';
export { getPlatformEnv, getPlatformEnvDefine, metroPlatformToViteEnvironment, type Platform, type PlatformEnv, type ViteEnvironment, } from './env/platformEnv';
export { checkAndClearMetroCacheFromVite } from './utils/metroCacheManager';
export { getMetroConfigFromViteConfig, buildMetroConfigInputFromViteConfig, } from './metro-config/getMetroConfigFromViteConfig';
export { patchMetroServerWithViteConfigAndMetroPluginOptions } from './metro-config/patchMetroServerWithViteConfigAndMetroPluginOptions';
//# sourceMappingURL=index.d.ts.map