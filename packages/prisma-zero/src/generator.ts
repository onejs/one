import type { DMMF } from '@prisma/generator-helper'
import { generatorHandler, type GeneratorOptions } from '@prisma/generator-helper'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
// @ts-ignore
import { version } from '../package.json'

type Config = {
  name: string
  prettier: boolean
  resolvePrettierConfig: boolean
  schemaVersion?: number
}

function mapPrismaTypeToZeroType(field: DMMF.Field): string {
  const typeMap: Record<string, string> = {
    String: 'string',
    Boolean: 'boolean',
    Int: 'number',
    Float: 'number',
    DateTime: 'number', // Zero uses timestamps
    Json: 'json',
    BigInt: 'number',
    Decimal: 'number',
  }

  let output = `${field.name}: `
  if (field.kind === 'enum') {
    output += `enumeration<${field.type}>(${field.isRequired ? '' : 'true'})`
    return output
  }

  // If it's not an enum, we need to handle required and not required fields differently
  const value = typeMap[field.type] || 'string'
  if (field.isRequired) {
    output += `"${value}"`
  } else {
    output += `{ type: "${value}", optional: true }`
  }

  return output
}

function generateRelationships(model: DMMF.Model, dmmf: DMMF.Document): string {
  const relationships: string[] = []

  // Group relationships by relationName
  const relations = model.fields
    .filter((field) => field.relationName)
    .reduce<Record<string, DMMF.Field[]>>((acc, field) => {
      if (!acc[field.relationName!]) {
        acc[field.relationName!] = []
      }
      acc[field.relationName!].push(field)
      return acc
    }, {})

  for (const relName in relations) {
    const fields = relations[relName]
    const firstField = fields[0]
    const isManyToMany = fields.length > 1

    if (isManyToMany) {
      // Many-to-many relationship
      relationships.push(`    ${firstField.name}: [`)
      fields.forEach((field, index) => {
        const sourceField = field.relationFromFields?.[0] || 'id'
        const destField = field.relationToFields?.[0] || 'id'
        const destModel = field.type

        relationships.push(`      {`)
        relationships.push(`        sourceField: "${sourceField}",`)
        relationships.push(`        destField: "${destField}",`)
        relationships.push(`        destSchema: () => ${destModel}Schema,`)
        relationships.push(`      }${index === fields.length - 1 ? '' : ','}`)
      })
      relationships.push(`    ],`)
    } else {
      // One-to-many or many-to-one relationship
      const sourceField = firstField.relationFromFields?.[0] || 'id'
      const destField = firstField.relationToFields?.[0] || 'id'
      const destModel = firstField.type

      relationships.push(`    ${firstField.name}: {`)
      relationships.push(`      sourceField: "${sourceField}",`)
      relationships.push(`      destField: "${destField}",`)
      relationships.push(`      destSchema: () => ${destModel}Schema,`)
      relationships.push(`    },`)
    }
  }

  return relationships.join('\n')
}

function getTableName(model: DMMF.Model) {
  return model.dbName || model.name
}

function generateSchemaHash(models: DMMF.Model[], enums: DMMF.DatamodelEnum[]): string {
  const hash = createHash('sha256')

  // Only hash the structural elements that affect the schema
  const schemaStructure = {
    models: models.map((model) => ({
      name: model.name,
      dbName: model.dbName,
      fields: model.fields.map((f) => ({
        // Only include field properties that affect the schema
        name: f.name,
        type: f.type,
        isRequired: f.isRequired,
        isList: f.isList,
        relationName: f.relationName,
        relationFromFields: f.relationFromFields,
        relationToFields: f.relationToFields,
        default: f.default,
        unique: f.isUnique,
      })),
      primaryKey: model.primaryKey,
      uniqueFields: model.uniqueFields,
      uniqueIndexes: model.uniqueIndexes,
    })),
    enums: enums.map((enumType) => ({
      name: enumType.name,
      values: enumType.values.map((v) => ({
        name: v.name,
        dbName: v.dbName,
      })),
    })),
  }

  hash.update(JSON.stringify(schemaStructure))
  return hash.digest('hex')
}

async function getCurrentVersion(
  outputDir: string,
  filename: string
): Promise<{ version: number; hash: string | null }> {
  try {
    const content = await readFile(join(outputDir, filename), 'utf-8')
    const versionMatch = content.match(/version:\s*(\d+)/)
    const hashMatch = content.match(/Schema hash: ([a-f0-9]+)/)

    return {
      version: versionMatch ? Number.parseInt(versionMatch[1], 10) : 0,
      hash: hashMatch ? hashMatch[1] : null,
    }
  } catch {
    return { version: 0, hash: null }
  }
}

// Export the onGenerate function separately
export async function onGenerate(options: GeneratorOptions) {
  const { generator, dmmf: dmmfIn } = options

  const dmmf = {
    ...dmmfIn,
    models: dmmfIn.datamodel.models.filter((model) => {
      const tags = extractTags(model.documentation)
      if (tags.includes('private')) {
        return false
      }
      return true
    }),
  }

  const outputFile = 'schema.ts'
  const outputDir = generator.output?.value

  if (!outputDir) {
    throw new Error('Output directory is required')
  }

  // Generate hash and get current version
  const newHash = generateSchemaHash([...dmmf.datamodel.models], [...dmmf.datamodel.enums])
  const { version: currentVersion, hash: currentHash } = await getCurrentVersion(
    outputDir,
    outputFile
  )
  const nextAutoincrementVersion = currentHash !== newHash ? currentVersion + 1 : currentVersion

  if (generator.config.schemaVersion && Number.isNaN(Number(generator.config.schemaVersion))) {
    throw new Error('Schema version must be a number')
  }

  const config = {
    name: generator.name,
    prettier: generator.config.prettier === 'true', // Default false,
    resolvePrettierConfig: generator.config.resolvePrettierConfig !== 'false', // Default true
    schemaVersion: generator.config.schemaVersion
      ? Number(generator.config.schemaVersion)
      : nextAutoincrementVersion,
  } satisfies Config

  const enums = dmmf.datamodel.enums
  const models = dmmf.datamodel.models

  let output = `// Generated by @vxrn/prisma-zero\n\n`

  output += "import { createSchema, type Row, column } from '@rocicorp/zero'\n\n"
  output += 'const { enumeration } = column;\n\n'

  if (enums.length > 0) {
    output += '// Define enums\n\n'
    // Generate enums
    enums.forEach((enumType) => {
      // Generate TypeScript enum
      output += `export enum ${enumType.name} {\n`
      enumType.values.forEach((value) => {
        // Handle mapped values
        const enumValue = value.dbName || value.name
        output += `  ${value.name} = "${enumValue}",\n`
      })
      output += '}\n\n'
    })
  }

  if (models.length > 0) {
    output += '// Define schemas\n\n'

    // Generate schemas for models
    models.forEach((model) => {
      output += `const ${model.name}Schema = {\n`
      output += `  tableName: "${getTableName(model)}",\n`
      output += '  columns: {\n'

      model.fields
        .filter((field) => !field.relationName) // Skip relation fields
        .forEach((field) => {
          const fieldValue = mapPrismaTypeToZeroType(field)
          output += `    ${fieldValue},\n`
        })

      output += '  },\n'

      // Add relationships if any exist
      const relationships = generateRelationships(model, dmmf)
      if (relationships) {
        output += '  relationships: {\n'
        output += relationships
        output += '\n  },\n'
      }

      // Add primary key
      const primaryKey = model.primaryKey?.fields
        ? model.primaryKey.fields
        : model.fields.find((f) => f.isId)?.name

      if (!primaryKey) {
        throw new Error(`No primary key found for ${model.name}`)
      }

      const primaryKeyString = JSON.stringify(primaryKey)

      output += `  primaryKey: ${primaryKeyString},\n`
      output += '} as const;\n\n'
    })
  }

  output += '// Define schema\n\n'
  // Generate the main schema export
  output += 'export const schema = createSchema({\n'
  output += `  version: ${config.schemaVersion},\n`
  output += '  tables: {\n'
  models.forEach((model) => {
    output += `    ${getTableName(model)}: ${model.name}Schema,\n`
  })
  output += '  },\n'
  output += '});\n\n'

  // Generate types
  output += '\n// Define types\n'
  output += 'export type Schema = typeof schema;\n'
  models.forEach((model) => {
    output += `export type ${model.name} = Row<typeof ${model.name}Schema>;\n`
  })

  output += '\n// Schema hash: ' + newHash + '\n'

  // Ensure output directory exists
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
  }

  // Write the output to a file
  if (outputDir) {
    await writeFile(join(outputDir, outputFile), output)
  }
}

// Use the exported function in the generator handler
generatorHandler({
  onManifest() {
    return {
      version,
      defaultOutput: 'generated/zero',
      prettyName: 'Zero Schema',
    }
  },
  onGenerate,
})

function extractTags(doc?: string): string[] {
  if (!doc) return []
  const match = doc.match(/@tag\(([^)]+)\)/)
  if (!match) return []
  return match[1].split(',').map((tag) => tag.trim().replace(/['"]/g, ''))
}
