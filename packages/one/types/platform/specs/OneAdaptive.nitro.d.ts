import type { HybridObject } from 'react-native-nitro-modules';
import type { HingeState, SizeClass } from '../adaptive/types';
export interface OneAdaptive extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getSizeClass(): Promise<SizeClass>;
    getHinge(): Promise<HingeState | undefined>;
    addSizeClassListener(listener: (sizeClass: SizeClass) => void): () => void;
    addHingeListener(listener: (hinge: HingeState | undefined) => void): () => void;
}
//# sourceMappingURL=OneAdaptive.nitro.d.ts.map