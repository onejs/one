import type { ComponentType, ReactElement } from 'react';
import type { ControlledEvent } from '../controlled';
import { useControlled } from '../controlled';
import type { ControlledControlProps, ControlChange } from '../controlTypes';
export type DesktopButtonProps = ControlledControlProps & {
    title: string;
    systemImage?: string;
    bordered?: boolean;
    onPress?: () => void;
};
export declare function createButton<Props, NativeProps extends object>(NativeButton: ComponentType<NativeProps>, useNativeProps: (props: Props) => NativeProps): (props: Props) => import("react").JSX.Element;
type Binding<Event extends ControlledEvent> = ReturnType<typeof useControlled<Event>>;
export type DesktopToggleProps = ControlledControlProps & {
    label: string;
    isOn: boolean;
    onIsOnChange?: (event: ControlChange<{
        isOn: boolean;
    }>) => void;
};
export declare function createToggle<Event extends ControlledEvent>(render: (props: Omit<DesktopToggleProps, 'onIsOnChange'>, binding: Binding<Event>) => ReactElement, isOn: (event: Event) => boolean): ({ revision, onIsOnChange, ...props }: DesktopToggleProps) => ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export type DesktopSegmentedControlProps = ControlledControlProps & {
    labels: readonly string[];
    selectedIndex: number;
    controlRole?: 'automatic' | 'tabs' | 'valueSelection';
    onChange?: (event: ControlChange<{
        selectedIndex: number;
    }>) => void;
};
export declare function createSegmentedControl<Event extends ControlledEvent>(render: (props: Omit<DesktopSegmentedControlProps, 'onChange'>, binding: Binding<Event>) => ReactElement, selectedIndex: (event: Event) => number): ({ revision, controlRole, onChange, ...props }: DesktopSegmentedControlProps) => ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export {};
//# sourceMappingURL=createControls.d.ts.map