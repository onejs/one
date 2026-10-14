import type { HybridObject } from 'react-native-nitro-modules';
export interface OneCrypto extends HybridObject<{
    ios: 'c++';
    android: 'c++';
}> {
    fillRandomBytes(buffer: ArrayBuffer, offset: number, length: number): void;
    randomUUID(): string;
    digest(algorithm: string, buffer: ArrayBuffer, offset: number, length: number): Promise<ArrayBuffer>;
    aesEncrypt(key: ArrayBuffer, iv: ArrayBuffer, plaintext: ArrayBuffer, additionalData: ArrayBuffer | undefined, tagLength: number): Promise<ArrayBuffer>;
    aesDecrypt(key: ArrayBuffer, iv: ArrayBuffer, ciphertext: ArrayBuffer, additionalData: ArrayBuffer | undefined, tagLength: number): Promise<ArrayBuffer>;
}
//# sourceMappingURL=OneCrypto.nitro.d.ts.map