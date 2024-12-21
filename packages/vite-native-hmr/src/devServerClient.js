import prettyFormat from 'pretty-format';
import { getDevServerLocation } from './getDevServerLocation';
import { loadHMRClient } from './hmr-client';
// force import hmr client hacky
loadHMRClient();
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
class DevServerClient {
    constructor() {
        this.buffer = [];
        const initSocket = () => {
            const address = `ws://${getDevServerLocation().host}/__client`;
            this.socket = new WebSocket(address);
            const onClose = (event) => {
                console.warn('Disconnected from the Dev Server:', event.message);
                this.socket = undefined;
            };
            this.socket.onclose = onClose;
            this.socket.onerror = onClose;
            this.socket.onopen = () => {
                this.flushBuffer();
            };
        };
        if (process.env.NODE_ENV === 'development') {
            initSocket();
        }
    }
    send(level, data) {
        try {
            this.socket?.send(JSON.stringify({
                type: 'client-log',
                level,
                data: data.map((item) => typeof item === 'string'
                    ? item
                    : prettyFormat(item, {
                        escapeString: true,
                        highlight: true,
                        maxDepth: 3,
                        min: true,
                        plugins: [
                            // @ts-expect-error
                            prettyFormat.plugins.ReactElement,
                        ],
                    })),
            }));
        }
        catch {
            try {
                this.socket?.send(JSON.stringify({
                    type: 'client-log',
                    level,
                    data: data.map((item, index) => {
                        try {
                            return typeof item === 'string' ? item : JSON.stringify(item);
                        }
                        catch (err) {
                            return `Error stringifying item at index ${index} - ${item} - ${err}`;
                        }
                    }),
                }));
            }
            catch (err) {
                try {
                    this.socket?.send(JSON.stringify({
                        type: 'client-log',
                        level: 'error',
                        data: ['error sending client log: ' + err],
                    }));
                }
                catch {
                    // final err
                }
            }
            // Ignore error
        }
    }
    flushBuffer() {
        if (globalThis['__vxrnTmpLogs']) {
            globalThis['__vxrnTmpLogs'].forEach(({ level, data }) => {
                this.buffer.push({ level, data });
            });
            delete globalThis['__vxrnTmpLogs'];
        }
        for (const { level, data } of this.buffer) {
            this.send(level, data);
        }
        this.buffer = [];
    }
    log(level, data) {
        if (level === 'groupEnd') {
            return;
        }
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.flushBuffer();
            this.send(level, data);
        }
        else {
            if (globalThis['__vxrnTmpLogs'])
                return;
            this.buffer.push({ level, data });
        }
    }
}
export const client = new DevServerClient();
export const setup = () => { };
export const enable = () => { };
export const disable = () => { };
export const registerBundle = () => { };
export const log = (level, data) => {
    client.log(level, data);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2U2VydmVyQ2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGV2U2VydmVyQ2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sWUFBWSxNQUFNLGVBQWUsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRTVDLGdDQUFnQztBQUNoQyxhQUFhLEVBQUUsQ0FBQTtBQUVmOzs7Ozs7Ozs7R0FTRztBQUVILE1BQU0sZUFBZTtJQUluQjtRQUZBLFdBQU0sR0FBMEMsRUFBRSxDQUFBO1FBR2hELE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtZQUN0QixNQUFNLE9BQU8sR0FBRyxRQUFRLG9CQUFvQixFQUFFLENBQUMsSUFBSSxXQUFXLENBQUE7WUFDOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUVwQyxNQUFNLE9BQU8sR0FBRyxDQUFDLEtBQVksRUFBRSxFQUFFO2dCQUMvQixPQUFPLENBQUMsSUFBSSxDQUNWLG1DQUFtQyxFQUNsQyxLQUErQyxDQUFDLE9BQU8sQ0FDekQsQ0FBQTtnQkFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtZQUN6QixDQUFDLENBQUE7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7WUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1lBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3BCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQTtRQUVELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDM0MsVUFBVSxF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