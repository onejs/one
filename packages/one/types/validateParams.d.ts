/**
 * Route param validation for One routes.
 *
 * Provides type-safe route parameter validation with support for
 * Zod, Valibot, and custom validation functions. Runs before navigation
 * to catch invalid routes early.
 */
import type { StandardSchema, ZodLikeSchema, SearchValidatorFn } from './validateSearch';
/**
 * All supported validator types for route params
 */
export type ParamValidator<TInput = Record<string, unknown>, TOutput = TInput> = StandardSchema<TInput, TOutput> | ZodLikeSchema<TOutput> | SearchValidatorFn<TInput, TOutput>;
/**
 * Infer the output type from a param validator
 */
export type InferParamOutput<T> = T extends StandardSchema<any, infer O> ? O : T extends ZodLikeSchema<infer O> ? O : T extends SearchValidatorFn<any, infer O> ? O : never;
/**
 * Infer the input type from a param validator
 */
export type InferParamInput<T> = T extends StandardSchema<infer I, any> ? I : T extends ZodLikeSchema<any> ? Record<string, unknown> : T extends SearchValidatorFn<infer I, any> ? I : never;
/**
 * Error thrown when route param validation fails
 */
export declare class ParamValidationError extends Error {
    readonly routerCode = "VALIDATE_PARAMS";
    readonly issues: unknown[];
    readonly params: Record<string, unknown>;
    constructor(message: string, params: Record<string, unknown>, issues?: unknown[]);
}
/**
 * Error thrown when async route validation fails
 */
export declare class RouteValidationError extends Error {
    readonly routerCode = "VALIDATE_ROUTE";
    readonly details?: Record<string, unknown>;
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Props passed to validateRoute function
 */
export type ValidateRouteProps = {
    params: Record<string, string | string[]>;
    search: Record<string, string | string[]>;
    pathname: string;
    href: string;
};
/**
 * Result from validateRoute function
 */
export type ValidationResult = {
    valid: true;
} | {
    valid: false;
    error: string;
    details?: Record<string, unknown>;
};
/**
 * Async route validation function type
 */
export type RouteValidationFn = (props: ValidateRouteProps) => ValidationResult | Promise<ValidationResult> | void | Promise<void>;
/**
 * Validate route params using the provided validator
 *
 * @param validator - The validator to use (Standard Schema, Zod-like, or function)
 * @param input - The raw route params to validate
 * @returns The validated and transformed params
 * @throws ParamValidationError if validation fails
 */
export declare function validateParams<T extends ParamValidator>(validator: T, input: Record<string, unknown>): InferParamOutput<T>;
/**
 * Create a route param validator from a Zod schema.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zodParamValidator } from 'one'
 *
 * export const validateParams = zodParamValidator(z.object({
 *   id: z.string().uuid('Invalid ID format'),
 *   slug: z.string().min(1, 'Slug is required'),
 * }))
 * ```
 */
export declare function zodParamValidator<T extends ZodLikeSchema>(schema: T): T;
//# sourceMappingURL=validateParams.d.ts.map