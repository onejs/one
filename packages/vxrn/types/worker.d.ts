import type { VXRNOptionsFilled } from './config/getOptionsFilled';
type WorkerCommands = {
    name: 'bundle-react-native';
    arg: {
        options: VXRNOptionsFilled;
        platform: 'ios' | 'android';
    };
    returns: string;
};
export declare function runOnWorker<Command extends WorkerCommands>(name: Command['name'], arg: Command['arg']): Promise<Command['returns']>;
export {};
//# sourceMappingURL=worker.d.ts.map