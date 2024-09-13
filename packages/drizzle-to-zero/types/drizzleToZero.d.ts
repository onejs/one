import type { PgTableWithColumns, PgColumn } from 'drizzle-orm/pg-core';
import type { Relation, Relations } from 'drizzle-orm';
type ZeroColumnType = 'string' | 'number';
interface ZeroColumn {
    type: ZeroColumnType;
}
interface ZeroRelationship {
    source: string;
    dest: {
        field: string;
        schema: () => ZeroSchemaTable<any, any>;
    };
}
interface ZeroSchemaTable<TColumns extends Record<string, ZeroColumn>, TRelationships extends Record<string, ZeroRelationship>> {
    tableName: string;
    columns: TColumns;
    primaryKey: (keyof TColumns & string)[];
    relationships: TRelationships;
}
type ZeroSchema<T extends Record<string, PgTableWithColumns<any>>, R extends {
    [K in keyof T]?: Relations<any, any>;
}> = {
    [K in keyof T]: ZeroSchemaTable<ZeroTableColumns<T[K]['columns']>, ZeroTableRelationships<R[K] extends Relations<any, infer Rel> ? Rel : undefined>>;
};
type ZeroTableColumns<Columns extends Record<string, PgColumn<any, any, any>>> = {
    [K in keyof Columns]: ZeroColumnFromPgColumn<Columns[K]>;
};
type ZeroColumnFromPgColumn<TPgColumn extends PgColumn<any, any, any>> = TPgColumn extends PgColumn<infer ColumnProps, any, any> ? ColumnProps['columnType'] extends keyof DrizzleToZeroTypeMap ? {
    type: DrizzleToZeroTypeMap[ColumnProps['columnType']];
} : never : never;
type DrizzleToZeroTypeMap = {
    PgText: 'string';
    PgVarchar: 'string';
    PgDoublePrecision: 'number';
};
type ZeroTableRelationships<R extends Record<string, Relation<any>> | undefined> = R extends Record<string, Relation<any>> ? {
    [K in keyof R]: MapRelationToZero<R[K]>;
} : {};
type MapRelationToZero<R extends Relation<any>> = {
    source: string;
    dest: {
        field: string;
        schema: () => ZeroSchemaTable<any, any>;
    };
};
export declare function drizzleToZeroSchema<T extends Record<string, PgTableWithColumns<any>>, R extends {
    [K in keyof T]?: Relations<any, any>;
}>(drizzleSchema: T, relations: R): ZeroSchema<T, R>;
export {};
//# sourceMappingURL=drizzleToZero.d.ts.map