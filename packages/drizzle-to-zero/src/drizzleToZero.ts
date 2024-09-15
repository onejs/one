// @ts-nocheck
// drizzleToZero.ts

import type { PgTableWithColumns, PgColumn } from 'drizzle-orm/pg-core'
import type { Relation, Relations } from 'drizzle-orm'

// Adjusted DrizzleColumnType to match actual possible values
type DrizzleColumnType = 'PgText' | 'PgVarchar' | 'PgDoublePrecision'
type ZeroColumnType = 'string' | 'number'

interface ZeroColumn {
  type: ZeroColumnType
}

interface ZeroRelationship {
  source: string
  dest: {
    field: string
    schema: () => ZeroSchemaTable<any, any>
  }
}

interface ZeroSchemaTable<
  TColumns extends Record<string, ZeroColumn>,
  TRelationships extends Record<string, ZeroRelationship>,
> {
  tableName: string
  columns: TColumns
  primaryKey: (keyof TColumns & string)[]
  relationships: TRelationships
}

type ZeroSchema<
  T extends Record<string, PgTableWithColumns<any>>,
  R extends { [K in keyof T]?: Relations<any, any> },
> = {
  [K in keyof T]: ZeroSchemaTable<
    ZeroTableColumns<T[K]['columns']>,
    ZeroTableRelationships<R[K] extends Relations<any, infer Rel> ? Rel : undefined>
  >
}

type ZeroTableColumns<Columns extends Record<string, PgColumn<any, any, any>>> = {
  [K in keyof Columns]: ZeroColumnFromPgColumn<Columns[K]>
}

type ZeroColumnFromPgColumn<TPgColumn extends PgColumn<any, any, any>> = TPgColumn extends PgColumn<
  infer ColumnProps,
  any,
  any
>
  ? ColumnProps['columnType'] extends keyof DrizzleToZeroTypeMap
    ? {
        type: DrizzleToZeroTypeMap[ColumnProps['columnType']]
      }
    : never
  : never

type DrizzleToZeroTypeMap = {
  PgText: 'string'
  PgVarchar: 'string'
  PgDoublePrecision: 'number'
}

type ZeroTableRelationships<R extends Record<string, Relation<any>> | undefined> = R extends Record<
  string,
  Relation<any>
>
  ? {
      [K in keyof R]: MapRelationToZero<R[K]>
    }
  : {}

type MapRelationToZero<R extends Relation<any>> = {
  source: string
  dest: {
    field: string
    schema: () => ZeroSchemaTable<any, any>
  }
}

type GetPrimaryKeyColumns<Columns extends Record<string, PgColumn<any, any, any>>> = Extract<
  {
    [K in keyof Columns]: Columns[K] extends PgColumn<infer ColumnProps, any, any>
      ? ColumnProps['isPrimaryKey'] extends true
        ? K
        : never
      : never
  }[keyof Columns],
  string
>

const drizzleToZeroTypeMap: DrizzleToZeroTypeMap = {
  PgText: 'string',
  PgVarchar: 'string',
  PgDoublePrecision: 'number',
}

// Helper function to get typed entries
function typedEntries<T>(obj: T): [keyof T & string, T[keyof T]][] {
  return Object.entries(obj) as [keyof T & string, T[keyof T]][]
}

// Function to convert Drizzle schema to Zero schema
export function drizzleToZeroSchema<
  T extends Record<string, PgTableWithColumns<any>>,
  R extends { [K in keyof T]?: Relations<any, any> },
>(drizzleSchema: T, relations: R): ZeroSchema<T, R> {
  const zeroSchema = {} as ZeroSchema<T, R>

  // Convert table definitions
  for (const [tableName, table] of typedEntries(drizzleSchema)) {
    type TableColumns = ZeroTableColumns<typeof table.columns>
    type TableRelations = R[typeof tableName] extends Relations<any, infer Rel> ? Rel : undefined

    type ZeroTableRel = ZeroTableRelationships<TableRelations>

    // Build columns
    const columns = {} as TableColumns

    // Build primaryKey
    type PrimaryKeys = GetPrimaryKeyColumns<typeof table.columns>
    const primaryKey = [] as PrimaryKeys[]

    for (const columnName of Object.keys(table.columns) as (keyof typeof table.columns &
      string)[]) {
      const columnIn = table.columns[columnName]
      const column = columnIn as PgColumn<any, any, any>
      const drizzleType = getDrizzleColumnType(column)
      const zeroType = drizzleToZeroTypeMap[drizzleType]

      if (!zeroType) {
        throw new Error(`Unsupported Drizzle type: ${drizzleType}`)
      }

      columns[columnName] = { type: zeroType } as ZeroColumnFromPgColumn<typeof column>

      if (isPrimaryKey(column)) {
        primaryKey.push(columnName as PrimaryKeys)
      }
    }

    const zeroTable: ZeroSchemaTable<TableColumns, ZeroTableRel> = {
      tableName: tableName as string,
      columns,
      primaryKey,
      relationships: {} as any,
    }

    zeroSchema[tableName] = zeroTable
  }

  // Convert relationships separately
  for (const [tableName, relationDef] of typedEntries(relations)) {
    const zeroTable = zeroSchema[tableName]

    if (!zeroTable) {
      throw new Error(`Table not found for relations: ${String(tableName)}`)
    }

    if (!relationDef || !relationDef.config) continue

    // Create helpers
    const helpers = createTableRelationsHelpers(tableName)

    // Get relations
    const relationsConfig = relationDef.config(helpers)

    type TableRelations = typeof relationsConfig

    type ZeroTableRel = ZeroTableRelationships<TableRelations>

    const relationships = zeroTable.relationships as unknown as ZeroTableRel

    for (const [relationName, relation] of typedEntries(relationsConfig)) {
      relationships[relationName] = {
        source: relation.fields[0],
        dest: {
          field: relation.references[0],
          schema: () => zeroSchema[relation.referencedTableName as keyof T],
        },
      } as ZeroRelationship
    }
  }

  return zeroSchema
}

// Helper functions to extract properties from PgColumn
function getDrizzleColumnType<TPgColumn extends PgColumn<any, any, any>>(
  column: TPgColumn
): DrizzleColumnType {
  // Access the internal properties using type assertions
  return (column as any).config.columnType as DrizzleColumnType
}

function isPrimaryKey(column: PgColumn<any, any, any>): boolean {
  return (column as any).config.isPrimaryKey === true
}

// Implement createTableRelationsHelpers
function createTableRelationsHelpers<TTableName extends string>(tableName: TTableName) {
  return {
    one: (referencedTable: any, config?: any) => ({
      sourceTable: tableName,
      referencedTable,
      config,
      isNullable: false,
      withFieldName: function (fieldName: string) {
        this.fieldName = fieldName
        return this
      },
    }),
    many: (referencedTable: any, config?: any) => ({
      sourceTable: tableName,
      referencedTable,
      config,
      withFieldName: function (fieldName: string) {
        this.fieldName = fieldName
        return this
      },
    }),
  }
}
