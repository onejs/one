export interface DOMDescriptor {
    id: string;
    identity: string;
    moduleId: string;
}
export interface DOMManifest {
    protocolVersion: 1;
    buildId: string;
    entries: Record<string, string>;
}
export declare class DOMRegistry {
    private descriptors;
    private graphs;
    readonly root: string;
    constructor(root: string);
    descriptor(moduleId: string): DOMDescriptor;
    register(moduleId: string): DOMDescriptor;
    get(id: string): DOMDescriptor | undefined;
    replaceGraph(graph: string, entries: DOMDescriptor[]): void;
    hasModule(moduleId: string): boolean;
    invalidate(moduleId: string): void;
}
//# sourceMappingURL=registry.d.ts.map