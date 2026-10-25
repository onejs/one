import { Pressable, Text, View } from 'react-native'
import { router, useLoader, useLoaderState, type RouteType } from 'one'
import { DashboardChart } from '~/features/search-params/DashboardChart'
import { DashboardTable } from '~/features/search-params/DashboardTable'
import { SortBoundary, StrictSort } from '~/features/search-params/StrictSort'

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
  const { refetch } = useLoaderState(loader)
  return (
    <View testID="search-params-loader-page">
      <Text testID="loader-data">{JSON.stringify(data)}</Text>
      <DashboardTable />
      <DashboardChart />
      <SortBoundary>
        <StrictSort />
      </SortBoundary>
      <Pressable testID="loader-refetch" onPress={() => refetch()}>
        <Text>refetch</Text>
      </Pressable>
      <Pressable
        testID="loader-invalid"
        onPress={() => router.push('/search-params/loader?sort=sideways')}
      >
        <Text>invalid</Text>
      </Pressable>
    </View>
  )
}
