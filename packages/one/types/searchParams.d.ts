/**
 * Reading and writing typed search params.
 *
 * The URL is text. A schema reads it as a record of strings (a repeated key is an
 * array) and returns whatever the schema produces. Going back, a schema cannot turn
 * a value into text, so values are written by one fixed rule: strings, numbers,
 * booleans, or arrays of those, with repeated keys for arrays.
 */
import { type StandardSchemaV1 } from './standardSchema';
/** What a schema receives: every query key, a string or, when repeated, an array. */
export type SearchRecord = Record<string, string | string[]>;
type Scalar = string | number | boolean;
/** A value that has a defined URL form. */
export type SearchValue = Scalar | readonly Scalar[];
type UpdateValue<Out, In> = NonNullable<Out> extends SearchValue ? Out | null | undefined : In;
/**
 * What the update function accepts. A field whose output is a plain value is
 * written as that value, and `null` or `undefined` removes the key. A field whose
 * output cannot be written (a Date, an object) takes the schema's input type, the
 * text the schema reads, instead.
 */
export type SearchParamsUpdate<Schema extends StandardSchemaV1> = {
    [K in keyof StandardSchemaV1.InferOutput<Schema>]?: UpdateValue<StandardSchemaV1.InferOutput<Schema>[K], K extends keyof StandardSchemaV1.InferInput<Schema> ? StandardSchemaV1.InferInput<Schema>[K] : never>;
};
export type SearchParamsUpdateOptions = {
    /** Replace the current history entry instead of adding one. Default false. */
    replace?: boolean;
};
export type SearchParamsOptions = {
    /** Read the params of the active route even when this one is not focused. */
    global?: boolean;
};
export type UseSearchParamsSchemaResult<Schema extends StandardSchemaV1> = readonly [
    StandardSchemaV1.InferOutput<Schema>,
    (update: SearchParamsUpdate<Schema>, options?: SearchParamsUpdateOptions) => void
];
/**
 * Keeps the query of a params object. Path params, the hash and navigator keys ride
 * in the same object, but the route's href only carries the query, so its keys say
 * which entries to keep.
 */
export declare function toSearchRecord(params: Record<string, unknown>, href: string): SearchRecord;
export declare function searchRecordKey(record: SearchRecord): string;
export declare function parseSearchRecord<Schema extends StandardSchemaV1>(schema: Schema, record: SearchRecord): StandardSchemaV1.InferOutput<Schema>;
/**
 * Applies an update onto the current record. Keys the update does not name keep
 * their value and position, a named key with no value is removed.
 */
export declare function mergeSearchRecord(current: SearchRecord, update: Record<string, unknown>): SearchRecord;
export declare function stringifySearchRecord(record: SearchRecord): string;
/**
 * Adds search params to an href string. Keys in the update replace the same keys
 * already in the href, the path, other keys and the hash stay.
 */
export declare function applySearchParams(href: string, update: Record<string, unknown> | undefined): string;
export {};
//# sourceMappingURL=searchParams.d.ts.map