import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
export type HostAxis = 'vertical' | 'horizontal';
export type HostAlignment = 'leading' | 'center' | 'trailing';
export interface HostProps extends ViewProps {
    axis?: HostAxis;
    spacing?: number;
    alignment?: HostAlignment;
    children: ReactNode;
}
export declare const hostAxes: readonly ["vertical", "horizontal"];
export declare const hostAlignments: readonly ["leading", "center", "trailing"];
//# sourceMappingURL=hostTypes.d.ts.map