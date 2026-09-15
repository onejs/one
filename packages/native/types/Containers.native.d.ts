import { type FormProps, type GlassProps, type HostProps, type LabeledContentProps, type SectionProps, type SlotProps, type SpacerProps, type StackProps, type ZStackProps } from './generated/containerTypes';
export declare const InsideContainer: import("react").Context<boolean>;
export declare function Host({ axis, ...props }: HostProps): import("react/jsx-runtime").JSX.Element;
export declare function HStack(props: StackProps): import("react/jsx-runtime").JSX.Element;
export declare function VStack(props: StackProps): import("react/jsx-runtime").JSX.Element;
export declare function ZStack({ alignment, children, style, ...props }: ZStackProps): import("react/jsx-runtime").JSX.Element;
export declare function Spacer({ minLength, style, ...props }: SpacerProps): import("react/jsx-runtime").JSX.Element;
export declare function Form({ children, style, colorScheme, dynamicTypeSize, locale, tint, isEnabled, ...props }: FormProps): import("react/jsx-runtime").JSX.Element;
export declare function Section({ title, footer, children, style, ...props }: SectionProps): import("react/jsx-runtime").JSX.Element;
export declare function LabeledContent({ label, value, systemImage, children, style, ...props }: LabeledContentProps): import("react/jsx-runtime").JSX.Element;
export declare function Glass({ material, glassEffect, cornerRadius, tint, children, style, ...props }: GlassProps): import("react/jsx-runtime").JSX.Element;
export declare function Slot({ height, width, children, style, ...props }: SlotProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Containers.native.d.ts.map