/**
 * The Standard Schema interface (https://standardschema.dev), copied as the spec
 * recommends so schema libraries interoperate without a shared dependency.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown,
      options?: Options | undefined
    ) => Result<Output> | Promise<Result<Output>>
    readonly types?: Types<Input, Output> | undefined
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult

  export interface SuccessResult<Output> {
    readonly value: Output
    readonly issues?: undefined
  }

  export interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>
  }

  export interface Issue {
    readonly message: string
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  export interface PathSegment {
    readonly key: PropertyKey
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input
    readonly output: Output
  }

  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['input']

  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output']
}

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as any)['~standard']?.validate === 'function'
  )
}

/**
 * Runs a Standard Schema synchronously. The protocol allows validate to return a
 * promise, which a render or a navigation check cannot wait on, so that is an error
 * here rather than a result that silently looks valid.
 */
export function validateStandardSchemaSync<Output>(
  schema: StandardSchemaV1<unknown, Output>,
  input: unknown
): StandardSchemaV1.Result<Output> {
  const result = schema['~standard'].validate(input)
  if (typeof (result as { then?: unknown }).then === 'function') {
    throw new TypeError(
      `This ${schema['~standard'].vendor} schema validates asynchronously. One reads and validates the URL synchronously, so use a synchronous schema.`
    )
  }
  return result as StandardSchemaV1.Result<Output>
}
