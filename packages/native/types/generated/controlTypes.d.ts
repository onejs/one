import type { ColorValue, ViewProps } from 'react-native';
import type * as Styles from './swiftui';
import type { KeyboardType, TextContentType } from '../textTypes';
import type { IconColorRole } from '../ui/iconRoles';
import type { NativeState } from '../syncNativeState';
export declare const glassEffects: readonly ['regular', 'clear', 'identity'];
export type GlassEffect = (typeof glassEffects)[number];
export declare const glassEffectShapes: readonly ['capsule', 'circle', 'containerRelativeShape', 'ellipse', 'rectangle', 'roundedRectangle'];
export type GlassEffectShape = (typeof glassEffectShapes)[number];
export declare const materials: readonly ['ultraThin', 'thin', 'regular', 'thick', 'ultraThick'];
export type Material = (typeof materials)[number];
export interface OneNativeStyle {
    fontSize?: number;
    fontWeight?: string;
    fontDesign?: string;
    textStyle?: string;
    foregroundStyle?: ColorValue;
    tint?: ColorValue;
    background?: ColorValue;
    padding?: number;
    paddingTop?: number;
    paddingLeading?: number;
    paddingBottom?: number;
    paddingTrailing?: number;
    width?: number;
    height?: number;
    minWidth?: number;
    idealWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    idealHeight?: number;
    maxHeight?: number;
    cornerRadius?: number;
    opacity?: number;
    borderColor?: ColorValue;
    borderWidth?: number;
    glassEffect?: GlassEffect;
    glassEffectInteractive?: boolean;
    glassEffectTint?: ColorValue;
    glassEffectShape?: GlassEffectShape;
    material?: Material;
}
export type OneNativeViewProps = Pick<ViewProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityValue' | 'testID' | 'style' | 'onLayout'> & {
    swiftStyle?: OneNativeStyle;
};
export type PickerOption = Readonly<{
    value: string;
    label: string;
}>;
export type DialogAction = Readonly<{
    id: string;
    label: string;
    role?: Styles.ButtonRole;
}>;
export type MapMarker = Readonly<{
    id: string;
    label: string;
    latitude: number;
    longitude: number;
}>;
export interface PickerProps extends OneNativeViewProps {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    options: readonly PickerOption[];
    pickerStyle?: Styles.PickerStyle;
}
export interface DatePickerProps extends OneNativeViewProps {
    selection: Date;
    onSelectionChange: (value: Date) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumDate?: Date;
    maximumDate?: Date;
    displayedComponents?: 'date' | 'hourAndMinute' | 'dateAndTime';
    datePickerStyle?: Styles.DatePickerStyle;
}
export interface ColorPickerProps extends OneNativeViewProps {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    supportsOpacity?: boolean;
}
export interface ToggleProps extends OneNativeViewProps {
    isOn: boolean;
    onIsOnChange: (value: boolean) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    toggleStyle?: Styles.ToggleStyle;
}
export interface SliderProps extends OneNativeViewProps {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    minimumValueLabel?: string;
    maximumValueLabel?: string;
    minimumValueImage?: string;
    maximumValueImage?: string;
}
export interface StepperProps extends OneNativeViewProps {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
}
export interface TextProps extends OneNativeViewProps {
    text?: string;
}
export interface LabelProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    systemImage?: string;
}
export interface ProgressViewProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    value?: number;
    total?: number;
    progressViewStyle?: Styles.ProgressViewStyle;
}
export interface GaugeProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    value?: number;
    minimumValue?: number;
    maximumValue?: number;
    currentValueLabel?: string;
    minimumValueLabel?: string;
    maximumValueLabel?: string;
    gaugeStyle?: Styles.GaugeStyle;
}
export interface ImageProps extends OneNativeViewProps {
    systemName?: string;
    symbolRenderingMode?: Styles.SymbolRenderingMode | '';
    symbolVariant?: Styles.SymbolVariants | '';
    imageScale?: Styles.ImageScale | '';
    variableValue?: number;
    colorRole?: IconColorRole | '';
}
export interface ShareLinkProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    item?: string;
    itemType?: 'text' | 'url';
    subject?: string;
    message?: string;
}
export interface ContentUnavailableViewProps extends OneNativeViewProps {
    onAction?: (id: string) => void;
    title?: string;
    systemImage?: string;
    description?: string;
    actions: readonly DialogAction[];
}
export interface CircleProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface CapsuleProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface RectangleProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface RoundedRectangleProps extends OneNativeViewProps {
    fill?: ColorValue;
    cornerRadius?: number;
}
export interface EllipseProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface VideoPlayerProps extends OneNativeViewProps {
    url?: string;
    autoplay?: boolean;
}
export interface PhotosPickerProps extends OneNativeViewProps {
    onPick?: (url: string, index: number, count: number) => void;
    onPickError?: (message: string) => void;
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    maxSelectionCount?: number;
    selectionBehavior?: Styles.PhotosPickerSelectionBehavior;
    filter?: 'any' | 'images' | 'videos' | 'livePhotos' | 'screenshots' | 'screenRecordings' | 'slomoVideos' | 'timelapseVideos' | 'cinematicVideos' | 'depthEffectPhotos' | 'bursts' | 'panoramas';
    preferredItemEncoding?: Styles.EncodingDisambiguationPolicy;
}
export interface WebViewProps extends OneNativeViewProps {
    onNavigate?: (url: string) => void;
    onTitleChange?: (title: string) => void;
    onLoadingChange?: (loading: boolean, progress: number) => void;
    url?: string;
    html?: string;
    backForwardNavigationGestures?: Styles.BackForwardNavigationGesturesBehavior | '';
    magnificationGestures?: Styles.MagnificationGesturesBehavior | '';
    linkPreviews?: Styles.LinkPreviewBehavior | '';
    elementFullscreen?: Styles.ElementFullscreenBehavior | '';
    contentBackground?: Styles.Visibility | '';
}
export type SignInWithAppleButtonCompletion = Readonly<{
    type: 'success';
    user: string;
    email: string;
    givenName: string;
    familyName: string;
    identityToken: string;
    authorizationCode: string;
}> | Readonly<{
    type: 'failed';
    message: string;
}> | Readonly<{
    type: 'cancelled';
}>;
export interface SignInWithAppleButtonProps extends OneNativeViewProps {
    onCompletion?: (completion: SignInWithAppleButtonCompletion) => void;
    requestedScopes?: readonly ('fullName' | 'email')[];
    nonce?: string;
}
export interface MapProps extends OneNativeViewProps {
    onRegionChange?: (latitude: number, longitude: number, distance: number) => void;
    latitude?: number;
    longitude?: number;
    distance?: number;
    markers: readonly MapMarker[];
}
export interface TextFieldProps extends OneNativeViewProps {
    text: string | NativeState<string>;
    onTextChange: (value: string) => void;
    revision?: number;
    focused?: boolean;
    onFocusChange?: (focused: boolean) => void;
    focusRevision?: number;
    onSubmit?: () => void;
    label?: string;
    disabled?: boolean;
    prompt?: string;
    textFieldStyle?: Styles.TextFieldStyle;
    submitLabel?: Styles.SubmitLabel | '';
    textInputAutocapitalization?: Styles.TextInputAutocapitalization | '';
    autocorrectionDisabled?: boolean;
    keyboardType?: KeyboardType | '';
    textContentType?: TextContentType | '';
    axis?: Styles.Axis;
}
export interface SecureFieldProps extends OneNativeViewProps {
    text: string | NativeState<string>;
    onTextChange: (value: string) => void;
    revision?: number;
    focused?: boolean;
    onFocusChange?: (focused: boolean) => void;
    focusRevision?: number;
    onSubmit?: () => void;
    label?: string;
    disabled?: boolean;
    prompt?: string;
    textFieldStyle?: Styles.TextFieldStyle;
    submitLabel?: Styles.SubmitLabel | '';
    textInputAutocapitalization?: Styles.TextInputAutocapitalization | '';
    autocorrectionDisabled?: boolean;
    keyboardType?: KeyboardType | '';
    textContentType?: TextContentType | '';
}
export interface AlertProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string, presenting: string) => void;
    title?: string;
    message?: string;
    presenting?: string;
    actions: readonly DialogAction[];
}
export interface ConfirmationDialogProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string, presenting: string) => void;
    title?: string;
    message?: string;
    presenting?: string;
    actions: readonly DialogAction[];
    titleVisibility?: Styles.Visibility;
}
export interface QuickLookProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    url?: string;
}
export type FileImporterCompletion = Readonly<{
    type: 'success';
    url: string;
    index: number;
    count: number;
}> | Readonly<{
    type: 'failed';
    message: string;
}> | Readonly<{
    type: 'cancelled';
}>;
export interface FileImporterProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onCompletion?: (completion: FileImporterCompletion) => void;
    allowedContentTypes?: readonly string[];
    allowsMultipleSelection?: boolean;
}
//# sourceMappingURL=controlTypes.d.ts.map