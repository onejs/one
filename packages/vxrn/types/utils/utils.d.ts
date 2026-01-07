import type fs from "node:fs";
export declare function tryStatSync(file: string): fs.Stats | undefined;
export declare function lookupFile(dir: string, fileNames: string[]): Promise<string | undefined>;
export declare function getHash(text: Buffer | string, length?: number): string;
export declare function getFileHash(path: string): Promise<string>;
//# sourceMappingURL=utils.d.ts.map
