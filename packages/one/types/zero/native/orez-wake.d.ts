import type { ClientState } from './types';
export type OrezWakeOptions = {
    auth?: () => string | undefined;
    getToken?: () => Promise<string>;
};
export declare function subscribeOrezWake(server: string, identity: Pick<ClientState, 'clientID' | 'clientGroupID'>, options: OrezWakeOptions, request: () => void): () => void;
//# sourceMappingURL=orez-wake.d.ts.map