import type { HybridObject } from 'react-native-nitro-modules';
import type { NetworkState } from '../network/types';
export interface OneNetwork extends HybridObject<{
    android: 'kotlin';
}> {
    getState(): Promise<NetworkState>;
    addStateListener(listener: (state: NetworkState) => void): () => void;
}
//# sourceMappingURL=OneNetwork.nitro.d.ts.map