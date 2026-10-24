import { Text, View } from 'react-native'
import { useParams } from 'one'
import { DashboardTable } from '~/features/search-params/DashboardTable'

export default function SearchParamsItem() {
  const params = useParams<{ id: string }>()
  return (
    <View testID="item-page">
      <Text testID="item-id">item {params.id}</Text>
      <DashboardTable />
    </View>
  )
}
