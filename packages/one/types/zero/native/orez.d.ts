import { type OrezWakeOptions } from './orez-wake';
import type { ClientState, Transport } from './types';
export type OrezTransportOptions = {
    server: string;
    appID: string;
    schemaVersion: string;
    shardNum?: number;
    headers?: () => Record<string, string> | Promise<Record<string, string>>;
    fetch?: typeof fetch;
    wake?: OrezWakeOptions;
    payloadCodec?: {
        encodePush(body: unknown): unknown | Promise<unknown>;
        decodePull(body: unknown): unknown | Promise<unknown>;
    };
};
export interface OrezTransport extends Transport {
    subscribeWake(identity: Pick<ClientState, 'clientID' | 'clientGroupID'>, request: () => void): () => void;
}
export declare function createOrezTransport(options: OrezTransportOptions): OrezTransport;
//# sourceMappingURL=orez.d.ts.map