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
    packageName?: string;
    modules: NativeSourceModule[];
    defaultView: boolean;
    hash: string;
    declaration: string;
}
export interface SwiftPackageArtifacts {
    packageId: string;
    hash: string;
    files: Record<string, string[]>;
    modules: Record<string, string[]>;
    defaultViewFiles: string[];
    contracts: NativeSourceContract[];
    glue: string;
}
export declare function nativeSourceContract(file: string, source: string): NativeSourceContract;
export declare function kotlinSourceId(root: string, file: string): string;
export declare function swiftPodManifest(file: string, source: string): {
    languageMode: 5 | 6;
    mainActorIsolation: boolean;
};
export declare function writeNativeSourceDeclaration(file: string): NativeSourceContract;
export declare function writeNativeSourceDeclarations(root: string): NativeSourceContract[];
export declare function writeSwiftPackageArtifacts(packageDir: string): SwiftPackageArtifacts;
export declare function renderSwiftSourceGlue(packageId: string, contracts: NativeSourceContract[]): {
    hash: string;
    source: string;
};
export declare function renderKotlinSourceGlue(sourceId: string, contract: NativeSourceContract): {
    hash: string;
    source: string;
};
//# sourceMappingURL=nativeSourceContract.d.ts.map