/**
 * With Webpack we don't use built-in metro-specific HMR client,
 * so the module `react-native/Libraries/Utilities/HMRClient.js` should be replaced with this one.
 *
 * Most of the code is noop apart from the `log` function which handles sending logs from client
 * application to the dev server.
 *
 * The console gets "polyfilled" here:
 * https://github.com/facebook/react-native/blob/v0.63.4/Libraries/Core/setUpDeveloperTools.js#L51-L69
 */
declare class DevServerClient {
  socket?: WebSocket;
  buffer: Array<{
    level: string;
    data: any[];
  }>;
  constructor();
  send(level: string, data: any[]): void;
  flushBuffer(): void;
  log(level: string, data: any[]): void;
  setup(): void;
}
export declare const client: DevServerClient;
export declare const setup: () => void;
export declare const enable: () => void;
export declare const disable: () => void;
export declare const registerBundle: () => void;
export declare const log: (level: string, data: any[]) => void;
export {};
//# sourceMappingURL=devServerClient.d.ts.map
