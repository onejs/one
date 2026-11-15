import { Text, View } from 'react-native'
import { useParams } from 'one'
import { DashboardTable } from '~/features/search-params/DashboardTable'

export function generateStaticParams() {
  return [{ id: '5' }, { id: '7' }]
}

export default function SearchParamsItem() {
  const params = useParams<{ id: string }>()
  return (
    <View testID="item-page">
      <Text testID="item-id">item {params.id}</Text>
      <DashboardTable />
    </View>
  )
}
