import { Text, View } from 'react-native'
import { useLoader, type RouteType } from 'one'
import { DashboardChart } from '~/features/search-params/DashboardChart'
import { DashboardTable } from '~/features/search-params/DashboardTable'
import { StrictSort } from '~/features/search-params/StrictSort'

// the schemas of the components below validate the query before this runs
export async function loader({
  searchParams,
}: RouteType<'/search-params/loader'>['LoaderProps']) {
  const calls = ((globalThis as any).__searchParamsLoaderCalls ?? 0) + 1
  ;(globalThis as any).__searchParamsLoaderCalls = calls
  return { calls, searchParams: searchParams ?? null }
}

export default function SearchParamsLoaderPage() {
  const data = useLoader(loader)
  return (
    <View testID="search-params-loader-page">
      <Text testID="loader-data">{JSON.stringify(data)}</Text>
      <DashboardTable />
      <DashboardChart />
      <StrictSort />
    </View>
  )
}
