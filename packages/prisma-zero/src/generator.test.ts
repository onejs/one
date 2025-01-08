import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { DMMF, GeneratorOptions } from '@prisma/generator-helper'
import * as fs from 'node:fs/promises'
import { onGenerate } from './generator'

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
}))

// Helper Functions
function createField(
  name: string,
  type: string,
  isRequired = true,
  isList = false,
  relationName?: string
): DMMF.Field {
  return {
    name,
    kind: 'scalar',
    type,
    isRequired,
    isList,
    relationName,
    isId: false,
    isReadOnly: false,
    isGenerated: false,
    isUpdatedAt: false,
    isUnique: false,
    hasDefaultValue: false,
    documentation: undefined,
    relationFromFields: [],
    relationToFields: [],
  }
}

function createTestOptions(dmmf: DMMF.Document): GeneratorOptions {
  return {
    generator: {
      output: { value: 'generated', fromEnvVar: null },
      name: 'test-generator',
      config: {},
      provider: { value: 'test-provider', fromEnvVar: null },
      binaryTargets: [],
      previewFeatures: [],
      sourceFilePath: '',
    },
    dmmf,
    schemaPath: '',
    datasources: [],
    otherGenerators: [],
    version: '0.0.0',
    datamodel: '',
  }
}

function createMockDMMF(models: DMMF.Model[], enums: DMMF.DatamodelEnum[] = []): DMMF.Document {
  return {
    datamodel: {
      models,
      enums,
      types: [],
      indexes: [],
    },
    schema: {} as any,
    mappings: {} as any,
  }
}

function createModel(
  name: string,
  fields: DMMF.Field[],
  options: Partial<DMMF.Model> = {}
): DMMF.Model {
  return {
    name,
    dbName: null,
    fields,
    uniqueFields: [],
    uniqueIndexes: [],
    primaryKey: null,
    ...options,
  }
}

describe('Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Schema Generation', () => {
    it('should generate correct schema for basic model', async () => {
      const mockModel: DMMF.Model = {
        name: 'User',
        dbName: null,
        fields: [
          { ...createField('id', 'String'), isId: true },
          createField('name', 'String'),
          createField('email', 'String'),
          { ...createField('age', 'Int'), isRequired: false },
        ],
        uniqueFields: [],
        uniqueIndexes: [],
        primaryKey: null,
      }

      await onGenerate(createTestOptions(createMockDMMF([mockModel])))

      // Verify mkdir was called
      expect(fs.mkdir).toHaveBeenCalledWith('generated', { recursive: true })

      // Verify writeFile was called with correct schema
      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls
      expect(writeFileCalls.length).toBe(1)

      const [, contentBuffer] = writeFileCalls[0]
      const content = contentBuffer.toString()

      expect(content).toMatchSnapshot()
    })

    it('should handle enums correctly', async () => {
      const mockEnum: DMMF.DatamodelEnum = {
        name: 'Role',
        values: [
          { name: 'USER', dbName: null },
          { name: 'ADMIN', dbName: null },
        ],
        dbName: null,
      }

      const mockModel: DMMF.Model = {
        name: 'User',
        dbName: null,
        fields: [
          { ...createField('id', 'String'), isId: true },
          { ...createField('role', 'Role'), kind: 'enum' },
        ],
        uniqueFields: [],
        uniqueIndexes: [],
        primaryKey: null,
      }

      await onGenerate(createTestOptions(createMockDMMF([mockModel], [mockEnum])))

      const [, contentBuffer] = vi.mocked(fs.writeFile).mock.calls[0]
      const content = contentBuffer.toString()

      expect(content).toMatchSnapshot()
    })

    it('should handle relationships correctly', async () => {
      const userModel = createModel('User', [
        { ...createField('id', 'String'), isId: true },
        {
          ...createField('posts', 'Post', true, true),
          kind: 'object',
          relationName: 'UserPosts',
          relationToFields: ['id'],
          relationFromFields: ['userId'],
        },
      ])

      const postModel = createModel('Post', [
        { ...createField('id', 'String'), isId: true },
        {
          ...createField('userId', 'String'),
          kind: 'scalar',
          relationName: 'UserPosts',
          relationFromFields: ['userId'],
          relationToFields: ['id'],
        },
        {
          ...createField('user', 'User'),
          kind: 'object',
          relationName: 'UserPosts',
          relationFromFields: ['userId'],
          relationToFields: ['id'],
        },
      ])

      await onGenerate(createTestOptions(createMockDMMF([userModel, postModel])))

      const [, contentBuffer] = vi.mocked(fs.writeFile).mock.calls[0]
      const content = contentBuffer.toString()

      expect(content).toMatchSnapshot()
    })
  })

  describe('Schema Version Management', () => {
    it('should increment version when schema hash changes', async () => {
      // First generation with simpler model creation
      const initialModel = createModel('User', [
        { ...createField('id', 'String'), isId: true },
        createField('name', 'String'),
      ])

      // Mock initial file read to simulate no existing file
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('File not found'))

      await onGenerate(createTestOptions(createMockDMMF([initialModel])))

      // Get the first generated schema
      const [, firstContentBuffer] = vi.mocked(fs.writeFile).mock.calls[0]
      const firstContent = firstContentBuffer.toString()

      // Second generation with modified model
      const modifiedModel = createModel('User', [
        { ...createField('id', 'String'), isId: true },
        createField('name', 'String'),
        createField('email', 'String'), // Added field
      ])

      // Mock reading the generated file to be version 1
      vi.mocked(fs.readFile).mockResolvedValueOnce(firstContent)

      await onGenerate(createTestOptions(createMockDMMF([modifiedModel])))

      // Get the content of the last write
      const [, contentBuffer] = vi.mocked(fs.writeFile).mock.calls[1]
      const content = contentBuffer.toString()

      // Version should be incremented
      expect(content).toContain('version: 2')
    })

    it('should not increment version when schema hash remains the same', async () => {
      const model = createModel('User', [
        { ...createField('id', 'String'), isId: true },
        createField('name', 'String'),
      ])

      const dmmf = createMockDMMF([model])

      // Mock reading existing schema with version 1
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        Buffer.from('version: 1\n// Schema hash: abc123')
      )

      await onGenerate(createTestOptions(dmmf))

      const [, contentBuffer] = vi.mocked(fs.writeFile).mock.calls[
        vi.mocked(fs.writeFile).mock.calls.length - 1
      ]
      const content = contentBuffer.toString()

      // Version should remain the same
      expect(content).toContain('version: 1')
    })

    it('should use provided schemaVersion from generator config', async () => {
      const model = createModel('User', [
        { ...createField('id', 'String'), isId: true },
        createField('name', 'String'),
      ])

      const options = createTestOptions(createMockDMMF([model]))
      // Set the schema version in generator config
      options.generator.config.schemaVersion = '42'

      await onGenerate(options)

      const [, contentBuffer] = vi.mocked(fs.writeFile).mock.calls[
        vi.mocked(fs.writeFile).mock.calls.length - 1
      ]
      const content = contentBuffer.toString()

      // Version should match the provided config value
      expect(content).toContain('version: 42')
    })
  })
})
