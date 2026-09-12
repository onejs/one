import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { Edge, PresentationAdaptation } from './swiftui';
export interface PopoverProps extends ViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    arrowEdge?: Edge;
    presentationCompactAdaptation?: PresentationAdaptation;
    contentWidth: number;
    contentHeight: number;
    content: ReactNode;
    children: ReactNode;
}
//# sourceMappingURL=popoverTypes.d.ts.map