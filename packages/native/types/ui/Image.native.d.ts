import type { ImageProps as RNImageProps } from 'react-native';
export type ImageProps = Omit<RNImageProps, 'source' | 'resizeMode'> & {
    source: string | number | {
        uri: string;
    };
    resizeMode?: 'cover' | 'contain' | 'center' | 'stretch';
    recyclingKey?: string;
};
export declare function Image({ source, ...props }: ImageProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Image.native.d.ts.map