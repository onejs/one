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

const typeText = (row: PropDef) =>
  row.default === undefined ? row.type : `${row.type} = ${String(row.default)}`

// a reference table in the docs' regular table style, with the table's title as the
// first column header. cells share a baseline so a row's first lines align. phones
// stack each row in one column: name, type, then description, where long generic
// types may break anywhere so the table never scrolls sideways.
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
          <Th $sm={{ display: 'none' }}>Type</Th>
          <Th $sm={{ display: 'none' }}>Description</Th>
        </Tr>
      </Thead>
      <Tbody>
        {data.map((row) => (
          <Tr key={row.name}>
            <Td verticalAlign="baseline">
              <YStack gap="$1.5" ai="flex-start">
                <CodeInline
                  whiteSpace="nowrap"
                  textDecorationLine={row.deprecated ? 'line-through' : 'none'}
                >
                  {row.name}
                  {row.required ? ' (required)' : ''}
                </CodeInline>
                <Text
                  display="none"
                  $sm={{ display: 'flex' }}
                  style={{ overflowWrap: 'anywhere' }}
                  fontFamily="$mono"
                  fontSize={13}
                  lineHeight={18}
                  color="$color10"
                >
                  {typeText(row)}
                </Text>
                <Text display="none" $sm={{ display: 'flex' }} fontSize="$4" color="$color12">
                  {row.description}
                </Text>
              </YStack>
            </Td>
            <Td
              $sm={{ display: 'none' }}
              fontFamily="$mono"
              fontSize={13}
              lineHeight={18}
              color="$color10"
              verticalAlign="baseline"
            >
              {typeText(row)}
            </Td>
            <Td $sm={{ display: 'none' }} verticalAlign="baseline">
              {row.description}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
