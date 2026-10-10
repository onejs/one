import type { ImageProps as RNImageProps } from 'react-native';
export type ImageProps = Omit<RNImageProps, 'source' | 'resizeMode' | 'onLoad' | 'onError'> & {
    source: string | number | {
        uri: string;
    };
    resizeMode?: 'cover' | 'contain' | 'center' | 'stretch';
    recyclingKey?: string;
    onLoad?: (event: {
        nativeEvent: {
            source: {
                uri: string;
                width: number;
                height: number;
            };
        };
    }) => void;
    onError?: (event: {
        nativeEvent: {
            error: string;
        };
    }) => void;
};
export declare function Image({ source, onLoadStart, onLoad, onError, onLoadEnd, ...props }: ImageProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Image.native.d.ts.map