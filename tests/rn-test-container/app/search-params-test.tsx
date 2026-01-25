import React from 'react'
import { View, Text } from 'react-native'
import { useSearchParams, useParams } from 'one'

export default function SearchParamsTest() {
  const searchParams = useSearchParams()
  const params = useParams()

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="title" style={{ fontSize: 20, marginBottom: 20 }}>
        useSearchParams Test
      </Text>

      <Text testID="search-sort">sort: {searchParams.get('sort') ?? 'null'}</Text>
      <Text testID="search-page">page: {searchParams.get('page') ?? 'null'}</Text>
      <Text testID="search-missing">
        missing: {searchParams.get('missing') ?? 'null'}
      </Text>

      <Text testID="params-sort">params.sort: {String(params.sort ?? 'undefined')}</Text>
      <Text testID="params-page">params.page: {String(params.page ?? 'undefined')}</Text>

      <Text testID="has-sort">has sort: {String(searchParams.has('sort'))}</Text>
      <Text testID="to-string">toString: {searchParams.toString()}</Text>
    </View>
  )
}
