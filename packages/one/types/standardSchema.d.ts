/**
 * The Standard Schema interface (https://standardschema.dev), copied as the spec
 * recommends so schema libraries interoperate without a shared dependency.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
    readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}
export declare namespace StandardSchemaV1 {
    interface Props<Input = unknown, Output = Input> {
        readonly version: 1;
        readonly vendor: string;
        readonly validate: (value: unknown, options?: Options | undefined) => Result<Output> | Promise<Result<Output>>;
        readonly types?: Types<Input, Output> | undefined;
    }
    type Result<Output> = SuccessResult<Output> | FailureResult;
    interface SuccessResult<Output> {
        readonly value: Output;
        readonly issues?: undefined;
    }
    interface Options {
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    interface FailureResult {
        readonly issues: ReadonlyArray<Issue>;
    }
    interface Issue {
        readonly message: string;
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }
    interface PathSegment {
        readonly key: PropertyKey;
    }
    interface Types<Input = unknown, Output = Input> {
        readonly input: Input;
        readonly output: Output;
    }
    type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input'];
    type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output'];
}
export declare function isStandardSchema(value: unknown): value is StandardSchemaV1;
/**
 * Runs a Standard Schema synchronously. The protocol allows validate to return a
 * promise, which a render or a navigation check cannot wait on, so that is an error
 * here rather than a result that silently looks valid.
 */
export declare function validateStandardSchemaSync<Output>(schema: StandardSchemaV1<unknown, Output>, input: unknown): StandardSchemaV1.Result<Output>;
//# sourceMappingURL=standardSchema.d.ts.map