import { join } from 'node:path'

export function getIndexJsonResponse({ port, root }: { port: number | string; root }) {
  return {
    name: 'myapp',
    slug: 'myapp',
    scheme: 'myapp',
    version: '1.0.0',
    jsEngine: 'jsc',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
      imageUrl: 'http://127.0.0.1:8081/assets/./assets/splash.png',
    },
    updates: { fallbackToCacheTimeout: 0 },
    assetBundlePatterns: ['**/*'],
    ios: { supportsTablet: true, bundleIdentifier: 'com.natew.myapp' },
    android: {
      package: 'com.tamagui.myapp',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
        foregroundImageUrl: 'http://127.0.0.1:8081/assets/./assets/adaptive-icon.png',
      },
    },
    web: { favicon: './assets/favicon.png' },
    extra: { eas: { projectId: '061b4470-78c7-4d6a-b850-8167fb0a3434' } },
    _internal: {
      isDebug: false,
      projectRoot: root,
      dynamicConfigPath: null,
      staticConfigPath: join(root, 'app.json'),
      packageJsonPath: join(root, 'package.json'),
    },
    sdkVersion: '50.0.0',
    platforms: ['ios', 'android', 'web'],
    iconUrl: `http://127.0.0.1:${port}/assets/./assets/icon.png`,
    debuggerHost: `127.0.0.1:${port}`,
    logUrl: `http://127.0.0.1:${port}/logs`,
    developer: { tool: 'expo-cli', projectRoot: root },
    packagerOpts: { dev: true },
    mainModuleName: 'index',
    __flipperHack: 'React Native packager is running',
    hostUri: `127.0.0.1:${port}`,
    bundleUrl: `http://127.0.0.1:${port}/index.bundle?platform=ios&dev=true&hot=false&lazy=true`,
    id: '@anonymous/myapp-473c4543-3c36-4786-9db1-c66a62ac9b78',
  }
}
