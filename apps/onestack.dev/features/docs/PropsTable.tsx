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

// a long camelCase name may wrap before each capital on phones. inline blocks give
// those breaks while nowrap still holds them together on wider screens.
const breakableName = (name: string) =>
  name.split(/(?=[A-Z])/).map((part, index) => (
    <span key={index} style={{ display: 'inline-block' }}>
      {part}
    </span>
  ))

const typeText = (row: PropDef) =>
  row.default === undefined ? row.type : `${row.type} = ${String(row.default)}`

// a reference table in the docs' regular table style, with the table's title as the
// first column header. cells share a baseline so a row's first lines align. phones
// drop the type column and show the type under the name, where long generic types
// may break anywhere so the table never scrolls sideways. a minimum width keeps short
// types such as ReactNode on one line.
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
          <Th>Description</Th>
        </Tr>
      </Thead>
      <Tbody>
        {data.map((row) => (
          <Tr key={row.name}>
            <Td verticalAlign="baseline" $sm={{ minWidth: 130 }}>
              <YStack gap="$1.5" ai="flex-start">
                <CodeInline
                  whiteSpace="nowrap"
                  $sm={{ whiteSpace: 'normal' }}
                  style={{ wordBreak: 'normal' }}
                  textDecorationLine={row.deprecated ? 'line-through' : 'none'}
                >
                  {breakableName(row.name)}
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
            <Td verticalAlign="baseline">{row.description}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
