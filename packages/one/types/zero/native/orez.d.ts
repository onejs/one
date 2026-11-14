import type { Transport } from './types';
export type OrezTransportOptions = {
    server: string;
    appID: string;
    schemaVersion: string;
    shardNum?: number;
    headers?: () => Record<string, string> | Promise<Record<string, string>>;
    fetch?: typeof fetch;
};
export declare function createOrezTransport(options: OrezTransportOptions): Transport;
//# sourceMappingURL=orez.d.ts.map