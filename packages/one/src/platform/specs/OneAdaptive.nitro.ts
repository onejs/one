import type { HybridObject } from 'react-native-nitro-modules'
import type { HingeState, SizeClass } from '../adaptive/types'

// window size class and hinge state behind One.UI.useSizeClass/useHinge.
// getInitial* are synchronous seed reads, evaluated once at JS import so the
// first render already measures real (mirrors safe-area initialWindowMetrics).
// a one-shot read plus change listeners: the first listener starts the
// platform monitor and the last removal stops it, so the first event can
// never race the subscription. add*Listener returns its remover.
// hinge is undefined when the device has no hinge.
export interface OneAdaptive extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getInitialSizeClass(): SizeClass
  getInitialHinge(): HingeState | undefined
  getSizeClass(): Promise<SizeClass>
  getHinge(): Promise<HingeState | undefined>
  addSizeClassListener(listener: (sizeClass: SizeClass) => void): () => void
  addHingeListener(listener: (hinge: HingeState | undefined) => void): () => void
}
