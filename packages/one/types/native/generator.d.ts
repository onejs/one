export type RootPlatformNamespace = 'iOS' | 'Android';
export interface OfficialProvenance {
    source: string;
    sdkVersion: string;
    declarationId: string;
}
export interface PlatformParameter {
    label: string;
    name: string;
    type: string;
    optional?: boolean;
}
export interface PlatformDeclaration {
    root: RootPlatformNamespace;
    namespace: string;
    typeName: string;
    member: string;
    parameters: PlatformParameter[];
    returnType: string;
    errors: string[];
    availability: Record<string, string>;
    deprecated?: string;
    provenance: OfficialProvenance;
}
export interface RepresentationChange {
    kind: 'typescript-mapping' | 'bridge-mapping';
    field: string;
    from: string;
    to: string;
    reason: string;
}
export declare function emitPlatformBinding(declaration: PlatformDeclaration, changes?: RepresentationChange[]): string;
export declare function validateBindingMatchesDeclaration(emitted: string, declaration: PlatformDeclaration): void;
export declare const representativeAppleDeclaration: PlatformDeclaration;
export declare const representativeAndroidDeclaration: PlatformDeclaration;
//# sourceMappingURL=generator.d.ts.map