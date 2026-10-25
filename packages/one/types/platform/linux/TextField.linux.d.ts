import type { ViewProps } from 'react-native';
export type TextFieldProps = Omit<ViewProps, 'children'> & {
    text: string;
    label?: string;
    prompt?: string;
    disabled?: boolean;
    revision?: number;
    onTextChange?: (text: string) => void;
    onSubmit?: () => void;
};
export declare function TextField(props: TextFieldProps): import("react").JSX.Element;
export declare function Field({ text, label, prompt, revision, onTextChange, onSubmit, style, secure, ...props }: TextFieldProps & {
    secure: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=TextField.linux.d.ts.map