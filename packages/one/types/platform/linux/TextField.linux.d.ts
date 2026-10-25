import type { ControlledControlProps } from '../controlTypes';
export type TextFieldProps = ControlledControlProps & {
    text: string;
    label?: string;
    prompt?: string;
    onTextChange?: (text: string) => void;
    onSubmit?: () => void;
};
export declare function TextField(props: TextFieldProps): import("react").JSX.Element;
export declare function Field({ text, label, prompt, revision, onTextChange, onSubmit, style, secure, ...props }: TextFieldProps & {
    secure: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=TextField.linux.d.ts.map