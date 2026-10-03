import { Text, View, styled } from 'tamagui'

// the docs' markdown tables, shared with PropsTable.
const TableBase = styled(View, {
  render: 'table',
  display: 'table' as any,
  width: '100%',
  my: '$4',
})

const TableWrapper = styled(View, {
  width: '100%',
  overflowX: 'auto' as any,
  my: '$4',
})

export const Table = (props: any) => (
  <TableWrapper>
    <TableBase
      className="mdx-table"
      my={0}
      style={{ borderCollapse: 'collapse' }}
      {...props}
    />
  </TableWrapper>
)

export const Thead = styled(View, {
  render: 'thead',
  display: 'table-header-group' as any,
})

export const Tbody = styled(View, {
  render: 'tbody',
  display: 'table-row-group' as any,
})

export const Tr = styled(View, {
  render: 'tr',
  display: 'table-row' as any,
})

export const Th = styled(Text, {
  render: 'th',
  display: 'table-cell' as any,
  py: '$2.5',
  px: '$3',
  fontWeight: '600',
  fontSize: '$4',
  color: '$color11',
  textAlign: 'left' as any,
  verticalAlign: 'bottom' as any,
  borderBottomWidth: 1,
  borderColor: '$color7',
})

export const Td = styled(Text, {
  render: 'td',
  display: 'table-cell' as any,
  py: '$2.5',
  px: '$3',
  fontSize: '$4',
  color: '$color12',
  textAlign: 'left' as any,
  verticalAlign: 'top' as any,
  borderBottomWidth: 1,
  borderColor: '$color4',
})
