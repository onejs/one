import { Text, YStack } from 'tamagui'
import { CodeInline } from './Code'
import { Table, Tbody, Td, Th, Thead, Tr } from './Table'

export type PropDef = {
  name: string
  required?: boolean
  deprecated?: boolean
  default?: string | boolean
  type: string
  description?: string
}

// a reference table in the docs' regular table style. the first column header is the
// table's title, and each name carries its type and default so phones keep two columns.
export function PropsTable({
  title = 'Props',
  data,
}: {
  title?: string
  data: PropDef[]
  // `file#Type` under packages/one/src/platform; nativeDocs.test.ts checks data against it
  source?: string
}) {
  return (
    <Table aria-label={title}>
      <Thead>
        <Tr>
          <Th>{title}</Th>
          <Th>Description</Th>
        </Tr>
      </Thead>
      <Tbody>
        {data.map((row) => (
          <Tr key={row.name}>
            <Td width="45%">
              <YStack gap="$1.5" ai="flex-start">
                <CodeInline
                  whiteSpace="nowrap"
                  textDecorationLine={row.deprecated ? 'line-through' : 'none'}
                >
                  {row.name}
                  {row.required ? ' (required)' : ''}
                </CodeInline>
                <Text fontFamily="$mono" fontSize={13} lineHeight={18} color="$color10">
                  {row.type}
                </Text>
                {row.default !== undefined && (
                  <Text fontFamily="$mono" fontSize={13} lineHeight={18} color="$color10">
                    = {String(row.default)}
                  </Text>
                )}
              </YStack>
            </Td>
            <Td>{row.description}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
