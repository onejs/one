import { type DesktopButtonProps } from '../desktop/createControls';
export type ButtonProps = Omit<DesktopButtonProps, 'revision'> & {
    /** fills the bezel with the accent color, for the button that confirms a dialog. */
    prominent?: boolean;
};
export declare const Button: (props: ButtonProps) => import("react").JSX.Element;
//# sourceMappingURL=Button.macos.d.ts.map