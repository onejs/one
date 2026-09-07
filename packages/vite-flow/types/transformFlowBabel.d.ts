export interface TransformFlowResult {
    code: string;
    map: any;
    toString(): string;
}
export declare function transformFlow(input: string, options?: {
    development?: boolean;
    path?: string;
}): Promise<TransformFlowResult>;
export declare function transformFlowBabel(input: string, options?: {
    development?: boolean;
    path?: string;
}): Promise<string>;
//# sourceMappingURL=transformFlowBabel.d.ts.map