import type { Crypto as CryptoApi } from './types';
export type { AESDecryptOptions, AESEncryptOptions, AESKeySize, AESSealedDataConfig, BinaryInput, CryptoApi, DigestAlgorithm, DigestEncoding, DigestStringOptions, GCMNonceParam, } from './types';
export type { AESEncryptionKey as AESEncryptionKeyType, AESSealedData as AESSealedDataType } from './aes';
export declare function installCrypto(): void;
export declare const AESEncryptionKey: {
    new (bytes: Uint8Array<ArrayBuffer>): {
        readonly size: import("./types").AESKeySize;
        bytes(): Promise<Uint8Array<ArrayBuffer>>;
        encoded(encoding: 'hex' | 'base64'): Promise<string>;
    };
    generate(size?: import("./types").AESKeySize): Promise<{
        readonly size: import("./types").AESKeySize;
        bytes(): Promise<Uint8Array<ArrayBuffer>>;
        encoded(encoding: 'hex' | 'base64'): Promise<string>;
    }>;
    import(bytes: Uint8Array): Promise<{
        readonly size: import("./types").AESKeySize;
        bytes(): Promise<Uint8Array<ArrayBuffer>>;
        encoded(encoding: 'hex' | 'base64'): Promise<string>;
    }>;
    import(encoded: string, encoding: 'hex' | 'base64'): Promise<{
        readonly size: import("./types").AESKeySize;
        bytes(): Promise<Uint8Array<ArrayBuffer>>;
        encoded(encoding: 'hex' | 'base64'): Promise<string>;
    }>;
};
export declare const AESSealedData: {
    new (parts: {
        iv: Uint8Array<ArrayBuffer>;
        ciphertext: Uint8Array<ArrayBuffer>;
        tag: Uint8Array<ArrayBuffer>;
    }): {
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
    fromCombined(combined: import("./types").BinaryInput, config?: import("./types").AESSealedDataConfig): {
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
    fromParts(iv: import("./types").BinaryInput, ciphertext: import("./types").BinaryInput, tag: import("./types").BinaryInput): {
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
    fromParts(iv: import("./types").BinaryInput, ciphertextWithTag: import("./types").BinaryInput, tagLength?: number): {
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
export declare const Crypto: CryptoApi;
//# sourceMappingURL=index.d.ts.map