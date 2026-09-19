import { type ReactNode } from 'react';
import { type LazyHStackProps, type LazyVStackProps, type ListProps, type ScrollViewProps } from './listTypes';
import { type ControlGroupProps, type DisclosureGroupProps, type DividerProps, type GroupProps, type LinkProps, type OverlayContentProps, type OverlayProps, type SwipeActionsActionsProps, type SwipeActionsProps } from './groupTypes';
import { type FormProps, type GlassProps, type HostProps, type LabeledContentProps, type SectionProps, type SlotProps, type SpacerProps, type StackProps, type ZStackProps } from './generated/containerTypes';
export declare const InsideContainer: import("react").Context<boolean>;
export declare function assertOneNativeChildren(children: ReactNode, owner: string): void;
export declare function Host({ axis, ...props }: HostProps): import("react/jsx-runtime").JSX.Element;
export declare function HStack(props: StackProps): import("react/jsx-runtime").JSX.Element;
export declare function VStack(props: StackProps): import("react/jsx-runtime").JSX.Element;
export declare function ZStack({ alignment, children, style, ...props }: ZStackProps): import("react/jsx-runtime").JSX.Element;
export declare function Spacer({ minLength, style, ...props }: SpacerProps): import("react/jsx-runtime").JSX.Element;
export declare function Form({ children, style, colorScheme, dynamicTypeSize, locale, tint, isEnabled, ...props }: FormProps): import("react/jsx-runtime").JSX.Element;
export declare function Section({ title, footer, children, style, ...props }: SectionProps): import("react/jsx-runtime").JSX.Element;
export declare function List({ listStyle, children, style, ...props }: ListProps): import("react/jsx-runtime").JSX.Element;
export declare function ScrollView({ axes, showsIndicators, children, style, ...props }: ScrollViewProps): import("react/jsx-runtime").JSX.Element;
export declare function LazyVStack({ alignment, spacing, children, style, ...props }: LazyVStackProps): import("react/jsx-runtime").JSX.Element;
export declare function LazyHStack({ alignment, spacing, children, style, ...props }: LazyHStackProps): import("react/jsx-runtime").JSX.Element;
export declare function LabeledContent({ label, value, systemImage, children, style, ...props }: LabeledContentProps): import("react/jsx-runtime").JSX.Element;
export declare function Glass({ material, glassEffect, cornerRadius, tint, children, style, ...props }: GlassProps): import("react/jsx-runtime").JSX.Element;
export declare function ControlGroup({ label, systemImage, controlGroupStyle, children, style, ...props }: ControlGroupProps): import("react/jsx-runtime").JSX.Element;
export declare function DisclosureGroup({ label, isExpanded, onIsExpandedChange, revision, children, style, ...props }: DisclosureGroupProps): import("react/jsx-runtime").JSX.Element;
export declare function Divider({ children, style, ...props }: DividerProps): import("react/jsx-runtime").JSX.Element;
export declare function Link({ destination, label, children, style, ...props }: LinkProps): import("react/jsx-runtime").JSX.Element;
export declare function Group({ children, style, ...props }: GroupProps): import("react/jsx-runtime").JSX.Element;
export declare function OverlayContent({ children, style, ...props }: OverlayContentProps): import("react/jsx-runtime").JSX.Element;
declare function OverlayFn({ alignment, children, style, ...props }: OverlayProps): import("react/jsx-runtime").JSX.Element;
export declare const Overlay: typeof OverlayFn & {
    Content: typeof OverlayContent;
};
export declare function SwipeActionsActions({ edge, allowsFullSwipe, children, style, ...props }: SwipeActionsActionsProps): import("react/jsx-runtime").JSX.Element;
declare function SwipeActionsFn({ children, style, ...props }: SwipeActionsProps): import("react/jsx-runtime").JSX.Element;
export declare const SwipeActions: typeof SwipeActionsFn & {
    Actions: typeof SwipeActionsActions;
};
export declare function Slot({ height, width, children, style, ...props }: SlotProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Containers.native.d.ts.map