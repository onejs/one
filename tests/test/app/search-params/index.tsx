import { useRef } from 'react'
import { Text, View } from 'react-native'
import { Link, usePathname, useSearchParams } from 'one'
import { DashboardChart } from '~/features/search-params/DashboardChart'
import { DashboardTable } from '~/features/search-params/DashboardTable'
import { SortBoundary, StrictSort } from '~/features/search-params/StrictSort'

export default function SearchParamsPage() {
  const mountId = useRef(Math.random().toString(36).slice(2)).current
  // the plain form still returns URLSearchParams
  const raw = useSearchParams()

  return (
    <View testID="search-params-page">
      <Text testID="page-mount">{mountId}</Text>
      <Text testID="page-pathname">{usePathname()}</Text>
      <Text testID="page-raw">{raw.toString()}</Text>

      <DashboardTable />
      <DashboardChart />
      <SortBoundary>
        <StrictSort />
      </SortBoundary>

      <Link testID="link-typed" href="/search-params" searchParams={{ page: 4, metric: 'revenue' }}>
        <Text>typed link</Text>
      </Link>
      <Link
        testID="link-item"
        href={{ pathname: '/search-params/item/[id]', params: { id: '7' } }}
        searchParams={{ page: 3, tags: ['x', 'y'] }}
      >
        <Text>item link</Text>
      </Link>
      <Link testID="link-keep" href="/search-params?metric=revenue#top" searchParams={{ page: 9 }}>
        <Text>keep existing query and hash</Text>
      </Link>
    </View>
  )
}
