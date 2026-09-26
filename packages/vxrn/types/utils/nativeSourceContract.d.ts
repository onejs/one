export interface NativeSourceMethod {
    name: string;
    parameters: {
        name: string;
        label: string | null;
        type: string;
        nativeType: string;
    }[];
    result: string;
    nativeResult: string;
    throws: boolean;
    async: boolean;
}
export interface NativeSourceModule {
    name: string;
    methods: NativeSourceMethod[];
}
export interface NativeSourceContract {
    language: 'swift' | 'kotlin';
    modules: NativeSourceModule[];
    defaultView: boolean;
    hash: string;
    declaration: string;
}
export declare function nativeSourceContract(file: string, source: string): NativeSourceContract;
export declare function writeNativeSourceDeclaration(file: string): NativeSourceContract;
export declare function writeNativeSourceDeclarations(root: string): NativeSourceContract[];
//# sourceMappingURL=nativeSourceContract.d.ts.map