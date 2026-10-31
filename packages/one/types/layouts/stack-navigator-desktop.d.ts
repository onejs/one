import type { ReactElement, ReactNode } from 'react';
export declare function getStackNavigatorProps<Args extends {
    children: ReactElement;
}>(_children: ReactNode, screenLayout?: (props: Args) => ReactElement): {
    screenLayout: (props: Args) => ReactElement;
} | {
    screenLayout?: undefined;
};
//# sourceMappingURL=stack-navigator-desktop.d.ts.map