import type { TableSchema } from '@rocicorp/zero'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { Button, H4, XStack, YStack } from 'tamagui'
import { proxy, useSnapshot } from 'valtio'
import { type Schema, schema } from '~/config/zero/schema'
import { useQuery } from '~/features/state/zero'
import { Table } from '~/interface/devtools/Table'

const globalState = proxy({
  activeTable: '',
  schema: schema as Schema,
})

const useState = () => useSnapshot(globalState)

export default () => {
  return (
    <YStack f={1}>
      <DataExplorer />
    </YStack>
  )
}

const Pane = ({
  title,
  children,
  onExit,
}: { title: string; children: any; onExit?: () => void }) => {
  return (
    <YStack>
      <XStack gap="$4" p="$2">
        {onExit && (
          <Button
            icon={ChevronLeft}
            onPress={() => {
              onExit()
            }}
          />
        )}
        <H4>{title}</H4>
      </XStack>

      {children}
    </YStack>
  )
}

const DataExplorer = () => {
  const state = useState()

  if (state.activeTable) {
    return <TableDataExplorer />
  }

  return (
    // <ScrollView f={1} horizontal>
    <XStack f={1} fw="wrap" gap="$4" ai="center" jc="center">
      {Object.entries(schema.tables).map(([tableName, tableSchema]) => {
        return (
          <YStack key={tableName} w="30%">
            <TableButton name={tableName} tableSchema={tableSchema} />
          </YStack>
        )
      })}
    </XStack>
    // </ScrollView>
  )
}

const TableButton = ({ name, tableSchema }: { name: string; tableSchema: TableSchema }) => {
  return (
    <Button
      onPress={() => {
        globalState.activeTable = name
      }}
    >
      <H4>{name}</H4>
    </Button>
  )
}

const TableDataExplorer = () => {
  const state = useState()
  const [data] = useQuery((q) => q[state.activeTable].limit(10))

  return (
    <Pane
      onExit={() => {
        globalState.activeTable = ''
      }}
      title={state.activeTable}
    >
      <Table data={data} />
    </Pane>
  )
}
