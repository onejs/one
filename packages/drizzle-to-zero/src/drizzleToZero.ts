// drizzleToZero.ts

import type { PgTableWithColumns, PgColumn } from 'drizzle-orm/pg-core'
import type { Relation, Relations } from 'drizzle-orm'
import { objectEntries } from './types'

// Adjusted DrizzleColumnType to match actual possible values
type DrizzleColumnType = 'PgText' | 'PgVarchar' | 'PgDoublePrecision'
type ZeroColumnType = 'string' | 'number'

interface ZeroColumn {
  type: ZeroColumnType
}

interface ZeroRelationship {
  sourceField: string
  destField: string
  destSchema: () => ZeroSchemaTable<any, any>
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

type ZeroTableRelationships<R extends Record<string, Relation<any>> | undefined> = R extends Record<
  string,
  Relation<any>
>
  ? {
      [K in keyof R]: MapRelationToZero<R[K]>
    }
  : {}

type MapRelationToZero<R extends Relation<any>> = {
  sourceField: string
  destField: string
  destSchema: () => ZeroSchemaTable<any, any>
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

// Function to convert Drizzle schema to Zero schema
export function drizzleToZeroSchema<
  Schema extends Record<string, PgTableWithColumns<any>>,
  R extends { [K in keyof Schema]?: Relations<any, any> },
>(drizzleSchema: Schema, relations: R): ZeroSchema<Schema, R> {
  const zeroSchema = {} as ZeroSchema<Schema, R>

  // Convert table definitions
  for (const [tableName, table] of objectEntries(drizzleSchema)) {
    type TableColumns = ZeroTableColumns<typeof table>
    type TableRelations = R[typeof tableName] extends Relations<any, infer Rel> ? Rel : undefined

    type ZeroTableRel = ZeroTableRelationships<TableRelations>

    // Build columns
    const columns = {} as TableColumns

    // Build primaryKey
    type PrimaryKeys = GetPrimaryKeyColumns<typeof table>
    const primaryKey = [] as PrimaryKeys[]

    for (const columnName of Object.keys(table)) {
      const columnIn = table[columnName]
      const column = columnIn as PgColumn<any, any, any>
      const drizzleType = getDrizzleColumnType(column)
      const zeroType = drizzleToZeroTypeMap[drizzleType]

      if (!zeroType) {
        throw new Error(`Unsupported Drizzle type: ${drizzleType}`)
      }

      // @ts-expect-error
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
  for (const [tableName, relationDef] of objectEntries(relations)) {
    // @ts-expect-error
    const zeroTable = zeroSchema[tableName]

    if (!zeroTable) {
      throw new Error(`Table not found for relations: ${String(tableName)}`)
    }

    if (!relationDef || !relationDef.config) continue
    if (typeof tableName !== 'string') continue

    // Create helpers

    const helpers = createTableRelationsHelpers(tableName)

    // Get relations
    const relationsConfig = relationDef.config(helpers as any)

    type TableRelations = typeof relationsConfig

    type ZeroTableRel = ZeroTableRelationships<TableRelations>

    const relationships = zeroTable.relationships as unknown as ZeroTableRel

    for (const [relationName, relation] of objectEntries(relationsConfig)) {
      if (!relation.config) {
        console.warn('no config')
        continue
      }

      relationships[relationName] = {
        // sourceField: relation.config.fields[0],
        // destField: relation.config.references[0],
        // destSchema: () => zeroSchema[relation.referencedTableName],
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
    one: (
      referencedTable: any,
      config?: {
        relationName: string
        fields: PgColumn[]
        references: PgColumn[]
      }
    ) => ({
      sourceTable: tableName,
      referencedTable,
      config,
      withFieldName: function (fieldName: string) {
        // @ts-expect-error
        this.fieldName = fieldName
        return this
      },
    }),
    many: (referencedTable: any, config?: any) => ({
      sourceTable: tableName,
      referencedTable,
      config,
      withFieldName: function (fieldName: string) {
        // @ts-expect-error
        this.fieldName = fieldName
        return this
      },
    }),
  }
}
