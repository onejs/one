import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { Visibility } from './swiftui';
export type PresentationDetent = 'medium' | 'large' | {
    fraction: number;
} | {
    height: number;
};
export interface SheetProps extends ViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    onDismiss?: () => void;
    revision?: number;
    presentationDetents?: readonly PresentationDetent[];
    presentationDragIndicator?: Visibility;
    interactiveDismissDisabled?: boolean;
    children: ReactNode;
}
//# sourceMappingURL=sheetTypes.d.ts.map