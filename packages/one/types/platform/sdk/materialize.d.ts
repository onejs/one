import { type WireHint } from './wire';
type Member = [
    name: string,
    id: number,
    flags?: number,
    arity?: number,
    hints?: (WireHint | null)[] | null,
    args?: (number | null)[] | null
];
export declare function defineSDKMembers(target: object, module: string, members: Member[], value?: boolean): {
    module: string;
    properties: Record<string, number>;
    methods?: Record<string, {
        id: number;
        args?: (number | null)[];
        hints?: (WireHint | null)[];
    }> | undefined;
};
export {};
//# sourceMappingURL=materialize.d.ts.map