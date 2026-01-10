import { type Component, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { type ViewProps } from 'react-native';
export interface Slot<Props = ViewProps, Ref = Component<ViewProps>> extends ForwardRefExoticComponent<Props & RefAttributes<Ref>> {
}
export declare const Slot: Slot;
//# sourceMappingURL=Slot.d.ts.map