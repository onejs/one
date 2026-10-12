import type { ArrangementPaneProps, ArrangementViewProps } from './ArrangementView.native';
export declare function ArrangementPrimary(_props: ArrangementPaneProps): never;
export declare function ArrangementSecondary(_props: ArrangementPaneProps): never;
export declare function ArrangementViewComponent({ children, primary, secondary, leading, detail, style, testID, }: ArrangementViewProps): import("react/jsx-runtime").JSX.Element;
export declare const ArrangementView: typeof ArrangementViewComponent & {
    Primary: typeof ArrangementPrimary;
    Secondary: typeof ArrangementSecondary;
    Leading: typeof ArrangementPrimary;
    Detail: typeof ArrangementSecondary;
};
//# sourceMappingURL=ArrangementView.d.ts.map