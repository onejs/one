/**
 * Search param validation for One routes.
 *
 * Provides type-safe search param parsing and validation with support for
 * Zod, Valibot, and custom validation functions.
 */
/**
 * Standard Schema interface (from standard-schema.dev)
 * Used by Valibot, ArkType, and others for interop.
 */
export interface StandardSchema<Input = unknown, Output = unknown> {
    readonly '~standard': {
        readonly version: 1;
        readonly vendor: string;
        readonly validate: (value: unknown) => {
            readonly value: Output;
            readonly issues?: undefined;
        } | {
            readonly value?: undefined;
            readonly issues: readonly unknown[];
        };
    };
}
/**
 * Zod-like schema interface
 */
export interface ZodLikeSchema<Output = unknown> {
    parse(value: unknown): Output;
    safeParse?(value: unknown): {
        success: true;
        data: Output;
    } | {
        success: false;
        error: unknown;
    };
}
/**
 * Custom validator function type
 */
export type SearchValidatorFn<TInput, TOutput> = (input: TInput) => TOutput;
/**
 * All supported validator types
 */
export type SearchValidator<TInput = Record<string, unknown>, TOutput = TInput> = StandardSchema<TInput, TOutput> | ZodLikeSchema<TOutput> | SearchValidatorFn<TInput, TOutput>;
/**
 * Infer the output type from a validator
 */
export type InferSearchOutput<T> = T extends StandardSchema<any, infer O> ? O : T extends ZodLikeSchema<infer O> ? O : T extends SearchValidatorFn<any, infer O> ? O : never;
/**
 * Infer the input type from a validator
 */
export type InferSearchInput<T> = T extends StandardSchema<infer I, any> ? I : T extends ZodLikeSchema<any> ? Record<string, unknown> : T extends SearchValidatorFn<infer I, any> ? I : never;
/**
 * Error thrown when search param validation fails
 */
export declare class SearchValidationError extends Error {
    readonly routerCode = "VALIDATE_SEARCH";
    readonly issues: unknown[];
    constructor(message: string, issues?: unknown[]);
}
/**
 * Parse search params from URL search string
 */
export declare function parseSearchString(search: string): Record<string, string | string[]>;
/**
 * Validate search params using the provided validator
 *
 * @param validator - The validator to use (Standard Schema, Zod-like, or function)
 * @param input - The raw search params to validate
 * @returns The validated and transformed search params
 * @throws SearchValidationError if validation fails
 */
export declare function validateSearch<T extends SearchValidator>(validator: T, input: Record<string, unknown>): InferSearchOutput<T>;
/**
 * Create a search param validator from a Zod schema.
 * This adapter wraps Zod schemas for use with One's validateSearch.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zodSearchValidator } from 'one'
 *
 * const searchSchema = z.object({
 *   page: z.number().default(1),
 *   filter: z.string().optional(),
 * })
 *
 * export const validateSearch = zodSearchValidator(searchSchema)
 * ```
 */
export declare function zodSearchValidator<T extends ZodLikeSchema>(schema: T): T;
/**
 * Create a fallback wrapper for search param fields.
 * Returns the fallback value if parsing fails instead of throwing.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { withFallback } from 'one'
 *
 * const schema = z.object({
 *   page: withFallback(z.number(), 1),
 * })
 * ```
 */
export declare function withFallback<T>(schema: ZodLikeSchema<T>, fallbackValue: T): ZodLikeSchema<T>;
//# sourceMappingURL=validateSearch.d.ts.map