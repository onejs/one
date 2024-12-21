import { getDevServerLocation } from './getDevServerLocation';
class HMRClient {
    constructor(app) {
        this.app = app;
        this.lastHash = '';
        const port = process.env.REACT_NATIVE_SERVER_PUBLIC_PORT || 8081;
        this.url = `ws://${getDevServerLocation().hostname}:${port}/__hmr?platform=${process.env.REACT_NATIVE_PLATFORM || 'ios'}`;
        this.socket = new WebSocket(this.url);
        console.info(' ⓵ [hmr] connecting...');
        this.socket.onopen = () => {
            console.info(' ⓵ [hmr] connected');
        };
        this.socket.onclose = () => {
            console.info(` ⓵ [hmr] disconnected ${this.url}`);
        };
        this.socket.onerror = (event) => {
            console.error(' ⓵ [hmr] error', event);
        };
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data.toString());
                this.processMessage(data);
            }
            catch (error) {
                console.warn(' ⓵ [hmr] invalid message', error);
            }
        };
    }
    upToDate(hash) {
        if (hash) {
            this.lastHash = hash;
        }
        // @ts-expect-error will deal with this when we get to it
        return this.lastHash === __webpack_hash__;
    }
    processMessage(message) {
        switch (message.action) {
            case 'building':
                this.app.LoadingView.showMessage('Rebuilding...', 'refresh');
                console.info(' ⓵ [hmr] bundle rebuilding', {
                    name: message.body?.name,
                });
                break;
            // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
            case 'built':
                console.info(' ⓵ [hmr] bundle rebuilt', {
                    name: message.body?.name,
                    time: message.body?.time,
                });
            // Fall through
            case 'sync':
                if (!message.body) {
                    console.warn(' ⓵ [hmr] message body is empty');
                    return;
                }
                if (message.body.errors?.length) {
                    message.body.errors.forEach((error) => {
                        console.error('Cannot apply update due to error:', error);
                    });
                    this.app.LoadingView.hide();
                    return;
                }
                if (message.body.warnings?.length) {
                    message.body.warnings.forEach((warning) => {
                        console.warn(' ⓵ [hmr] bundle contains warnings:', warning);
                    });
                }
                this.applyUpdate(message.body);
        }
    }
    applyUpdate(update) {
        if (!module.hot) {
            throw new Error(' ⓵ [hmr] hot Module Replacement is disabled.');
        }
        if (!this.upToDate(update.hash) && module.hot.status() === 'idle') {
            console.info(' ⓵ [hmr] checking for updates on the server...');
            this.checkUpdates(update);
        }
    }
    checkUpdates(update) {
        try {
            this.app.LoadingView.showMessage('Refreshing...', 'refresh');
            module.hot?.check(false).then((updatedModules) => {
                if (!updatedModules) {
                    console.warn(' ⓵ [hmr] cannot find update - full reload needed');
                    this.app.reload();
                    return;
                }
                module.hot
                    ?.apply({
                    ignoreDeclined: true,
                    ignoreUnaccepted: false,
                    ignoreErrored: false,
                    onDeclined: (data) => {
                        // This module declined update, no need to do anything
                        console.warn(' ⓵ [hmr] ignored an update due to declined module', {
                            chain: data.chain,
                        });
                    },
                })
                    .then((renewedModules) => {
                    if (!this.upToDate()) {
                        this.checkUpdates(update);
                    }
                    // Double check to make sure all updated modules were accepted (renewed)
                    const unacceptedModules = updatedModules.filter((moduleId) => {
                        return renewedModules && renewedModules.indexOf(moduleId) < 0;
                    });
                    if (unacceptedModules.length) {
                        console.warn(' ⓵ [hmr] not every module was accepted - full reload needed', {
                            unacceptedModules,
                        });
                        this.app.reload();
                    }
                    else {
                        console.info(' ⓵ [hmr] renewed modules - app is up to date', {
                            renewedModules,
                        });
                        this.app.dismissErrors();
                    }
                });
            });
        }
        catch (error) {
            if (module.hot?.status() === 'fail' || module.hot?.status() === 'abort') {
                console.warn(' ⓵ [hmr] cannot check for update - full reload needed');
                console.warn('[hmr]', error);
                this.app.reload();
            }
            else {
                console.warn(' ⓵ [hmr] update check failed', { error });
            }
        }
        finally {
            this.app.LoadingView.hide();
        }
    }
}
export const loadHMRClient = () => {
    const { DevSettings, Platform } = require('react-native');
    const LoadingView = require('react-native/Libraries/Utilities/LoadingView');
    const reload = () => DevSettings.reload();
    const dismissErrors = () => {
        if (Platform.OS === 'ios') {
            const NativeRedBox = require('react-native/Libraries/NativeModules/specs/NativeRedBox').default;
            NativeRedBox?.dismiss?.();
        }
        else {
            const NativeExceptionsManager = require('react-native/Libraries/Core/NativeExceptionsManager').default;
            NativeExceptionsManager?.dismissRedbox();
        }
        const LogBoxData = require('react-native/Libraries/LogBox/Data/LogBoxData');
        LogBoxData.clear();
    };
    new HMRClient({ reload, dismissErrors, LoadingView });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG1yLWNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhtci1jbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUEwQjdELE1BQU0sU0FBUztJQUtiLFlBQ1UsR0FPUDtRQVBPLFFBQUcsR0FBSCxHQUFHLENBT1Y7UUFWSCxhQUFRLEdBQUcsRUFBRSxDQUFBO1FBWVgsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsSUFBSSxJQUFJLENBQUE7UUFDaEUsSUFBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLG9CQUFvQixFQUFFLENBQUMsUUFBUSxJQUFJLElBQUksbUJBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLElBQUksS0FDdkMsRUFBRSxDQUFBO1FBRUYsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFckMsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBRXRDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFO1lBQ3pCLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ25ELENBQUMsQ0FBQTtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMs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