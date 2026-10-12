import type { ParsedPath } from './types';
type UriObject = string | {
    uri: string;
};
export declare class PathUtilities {
    static join(...paths: UriObject[]): string;
    static relative(from: UriObject, to: UriObject): string;
    static isAbsolute(path: UriObject): boolean;
    static normalize(path: UriObject): string;
    static dirname(path: UriObject): string;
    static basename(path: UriObject, ext?: string): string;
    static extname(path: UriObject): string;
    static parse(path: UriObject): ParsedPath;
}
export {};
//# sourceMappingURL=paths.d.ts.map