export declare function pathExists(path: string): Promise<boolean>;
export declare function readJSON<T = any>(path: string): Promise<T>;
export declare function readJSONSync<T = any>(path: string): T;
export declare function writeJSON(path: string, data: unknown): Promise<void>;
export declare function outputJSON(path: string, data: unknown): Promise<void>;
export declare function outputFileSync(path: string, data: string | Uint8Array, options?: {
    encoding?: BufferEncoding;
}): void;
//# sourceMappingURL=fs.d.ts.map