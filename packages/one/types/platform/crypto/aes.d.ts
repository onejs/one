import type { AESDecryptOptions, AESEncryptOptions, AESKeySize, AESSealedDataConfig, BinaryInput } from './types';
export type { AESDecryptOptions, AESEncryptOptions, AESKeySize, AESSealedDataConfig, BinaryInput };
export interface AesEngine {
    seal(key: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, plaintext: Uint8Array<ArrayBuffer>, additionalData: Uint8Array<ArrayBuffer> | undefined, tagLength: number): Promise<Uint8Array<ArrayBuffer>>;
    open(key: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, ciphertextWithTag: Uint8Array<ArrayBuffer>, additionalData: Uint8Array<ArrayBuffer> | undefined, tagLength: number): Promise<Uint8Array<ArrayBuffer>>;
    random(bytes: Uint8Array<ArrayBuffer>): void;
}
export declare function assertTagLength(tagLength: number, verb: string): void;
export declare function toBytes(input: BinaryInput, verb: string): Uint8Array<ArrayBuffer>;
type SealedParts = {
    iv: Uint8Array<ArrayBuffer>;
    ciphertext: Uint8Array<ArrayBuffer>;
    tag: Uint8Array<ArrayBuffer>;
};
export declare function createAesApi(engine: AesEngine): {
    AESEncryptionKey: {
        new (bytes: Uint8Array<ArrayBuffer>): {
            readonly size: AESKeySize;
            bytes(): Promise<Uint8Array<ArrayBuffer>>;
            encoded(encoding: 'hex' | 'base64'): Promise<string>;
        };
        generate(size?: AESKeySize): Promise<{
            readonly size: AESKeySize;
            bytes(): Promise<Uint8Array<ArrayBuffer>>;
            encoded(encoding: 'hex' | 'base64'): Promise<string>;
        }>;
        import(bytes: Uint8Array): Promise<{
            readonly size: AESKeySize;
            bytes(): Promise<Uint8Array<ArrayBuffer>>;
            encoded(encoding: 'hex' | 'base64'): Promise<string>;
        }>;
        import(encoded: string, encoding: 'hex' | 'base64'): Promise<{
            readonly size: AESKeySize;
            bytes(): Promise<Uint8Array<ArrayBuffer>>;
            encoded(encoding: 'hex' | 'base64'): Promise<string>;
        }>;
    };
    AESSealedData: {
        new (parts: SealedParts): {
            get ivSize(): number;
            get tagSize(): number;
            get combinedSize(): number;
            iv(encoding: 'base64'): Promise<string>;
            iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            tag(encoding: 'base64'): Promise<string>;
            tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            ciphertext(options: {
                encoding: 'base64';
                includeTag: boolean;
            }): Promise<string>;
            ciphertext(options: {
                encoding: 'bytes';
                includeTag: boolean;
            }): Promise<Uint8Array<ArrayBuffer>>;
            combined(encoding: 'base64'): Promise<string>;
            combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        };
        fromCombined(combined: BinaryInput, config?: AESSealedDataConfig): {
            get ivSize(): number;
            get tagSize(): number;
            get combinedSize(): number;
            iv(encoding: 'base64'): Promise<string>;
            iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            tag(encoding: 'base64'): Promise<string>;
            tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            ciphertext(options: {
                encoding: 'base64';
                includeTag: boolean;
            }): Promise<string>;
            ciphertext(options: {
                encoding: 'bytes';
                includeTag: boolean;
            }): Promise<Uint8Array<ArrayBuffer>>;
            combined(encoding: 'base64'): Promise<string>;
            combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        };
        fromParts(iv: BinaryInput, ciphertext: BinaryInput, tag: BinaryInput): {
            get ivSize(): number;
            get tagSize(): number;
            get combinedSize(): number;
            iv(encoding: 'base64'): Promise<string>;
            iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            tag(encoding: 'base64'): Promise<string>;
            tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            ciphertext(options: {
                encoding: 'base64';
                includeTag: boolean;
            }): Promise<string>;
            ciphertext(options: {
                encoding: 'bytes';
                includeTag: boolean;
            }): Promise<Uint8Array<ArrayBuffer>>;
            combined(encoding: 'base64'): Promise<string>;
            combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        };
        fromParts(iv: BinaryInput, ciphertextWithTag: BinaryInput, tagLength?: number): {
            get ivSize(): number;
            get tagSize(): number;
            get combinedSize(): number;
            iv(encoding: 'base64'): Promise<string>;
            iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            tag(encoding: 'base64'): Promise<string>;
            tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            ciphertext(options: {
                encoding: 'base64';
                includeTag: boolean;
            }): Promise<string>;
            ciphertext(options: {
                encoding: 'bytes';
                includeTag: boolean;
            }): Promise<Uint8Array<ArrayBuffer>>;
            combined(encoding: 'base64'): Promise<string>;
            combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        };
        fromSeal(iv: Uint8Array<ArrayBuffer>, ciphertextWithTag: Uint8Array, tagLength: number): {
            get ivSize(): number;
            get tagSize(): number;
            get combinedSize(): number;
            iv(encoding: 'base64'): Promise<string>;
            iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            tag(encoding: 'base64'): Promise<string>;
            tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            ciphertext(options: {
                encoding: 'base64';
                includeTag: boolean;
            }): Promise<string>;
            ciphertext(options: {
                encoding: 'bytes';
                includeTag: boolean;
            }): Promise<Uint8Array<ArrayBuffer>>;
            combined(encoding: 'base64'): Promise<string>;
            combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        };
    };
    aesEncrypt: (plaintext: BinaryInput, key: {
        readonly size: AESKeySize;
        bytes(): Promise<Uint8Array<ArrayBuffer>>;
        encoded(encoding: 'hex' | 'base64'): Promise<string>;
    }, options?: AESEncryptOptions) => Promise<{
        get ivSize(): number;
        get tagSize(): number;
        get combinedSize(): number;
        iv(encoding: 'base64'): Promise<string>;
        iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        tag(encoding: 'base64'): Promise<string>;
        tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        ciphertext(options: {
            encoding: 'base64';
            includeTag: boolean;
        }): Promise<string>;
        ciphertext(options: {
            encoding: 'bytes';
            includeTag: boolean;
        }): Promise<Uint8Array<ArrayBuffer>>;
        combined(encoding: 'base64'): Promise<string>;
        combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
    }>;
    aesDecrypt: {
        (sealedData: {
            get ivSize(): number;
            get tagSize(): number;
            get combinedSize(): number;
            iv(encoding: 'base64'): Promise<string>;
            iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            tag(encoding: 'base64'): Promise<string>;
            tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            ciphertext(options: {
                encoding: 'base64';
                includeTag: boolean;
            }): Promise<string>;
            ciphertext(options: {
                encoding: 'bytes';
                includeTag: boolean;
            }): Promise<Uint8Array<ArrayBuffer>>;
            combined(encoding: 'base64'): Promise<string>;
            combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        }, key: {
            readonly size: AESKeySize;
            bytes(): Promise<Uint8Array<ArrayBuffer>>;
            encoded(encoding: 'hex' | 'base64'): Promise<string>;
        }, options: AESDecryptOptions & {
            output: 'base64';
        }): Promise<string>;
        (sealedData: {
            get ivSize(): number;
            get tagSize(): number;
            get combinedSize(): number;
            iv(encoding: 'base64'): Promise<string>;
            iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            tag(encoding: 'base64'): Promise<string>;
            tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
            ciphertext(options: {
                encoding: 'base64';
                includeTag: boolean;
            }): Promise<string>;
            ciphertext(options: {
                encoding: 'bytes';
                includeTag: boolean;
            }): Promise<Uint8Array<ArrayBuffer>>;
            combined(encoding: 'base64'): Promise<string>;
            combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>;
        }, key: {
            readonly size: AESKeySize;
            bytes(): Promise<Uint8Array<ArrayBuffer>>;
            encoded(encoding: 'hex' | 'base64'): Promise<string>;
        }, options?: AESDecryptOptions): Promise<Uint8Array<ArrayBuffer>>;
    };
};
export type AESEncryptionKey = InstanceType<ReturnType<typeof createAesApi>['AESEncryptionKey']>;
export type AESSealedData = InstanceType<ReturnType<typeof createAesApi>['AESSealedData']>;
//# sourceMappingURL=aes.d.ts.map