import type { StyleProp, ViewStyle } from 'react-native';
export type DOMValue = null | boolean | number | string | DOMValue[] | {
    [key: string]: DOMValue;
};
export type DOMError = {
    name: string;
    message: string;
    code?: string;
    stack?: string;
};
export type DOMLoadEvent = {
    entryId: string;
    epoch: string;
};
export type DOMErrorEvent = DOMError & {
    entryId: string;
    epoch?: string;
};
/** container options consumed by the native host, never sent as component data. */
export type DOMProps = {
    style?: StyleProp<ViewStyle>;
    scrollEnabled?: boolean;
    matchContents?: boolean;
    onLoad?: (event: DOMLoadEvent) => void;
    onError?: (event: DOMErrorEvent) => void;
};
/** methods exposed through useDOMImperativeHandle always return promises. */
export type DOMImperativeHandle = {
    [method: string]: (...args: any[]) => Promise<DOMValue | void>;
};
export type DOMAction<Args extends DOMValue[] = DOMValue[], Result extends DOMValue | void = DOMValue | void> = (...args: Args) => Promise<Result>;
//# sourceMappingURL=types.d.ts.map