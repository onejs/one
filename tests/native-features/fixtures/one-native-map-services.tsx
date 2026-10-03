import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeMapServices() {
  const [status, setStatus] = useState('idle')

  async function run() {
    setStatus('searching')
    try {
      const ferry = { latitude: 37.7955, longitude: -122.3937 }
      const ballpark = { latitude: 37.7786, longitude: -122.3893 }
      const results = await One.iOS.MapServices.search('Ferry Building', ferry, 3000)
      const match = results.find((item) =>
        item.name.toLowerCase().includes('ferry') &&
        Math.abs(item.coordinate.latitude - ferry.latitude) < 0.02 &&
        Math.abs(item.coordinate.longitude - ferry.longitude) < 0.02)
      if (!match) throw new Error('Ferry Building search result missing')
      const canceledRequest = One.iOS.MapServices.autocomplete('Ferry', ferry, 3000)
        .then(() => 'resolved', (error: unknown) =>
          error !== null && typeof error === 'object' && 'code' in error ? String(error.code) : String(error))
      const suggestions = await One.iOS.MapServices.autocomplete('Ferry Bu', ferry, 3000)
      const canceled = await canceledRequest === 'E_MAP_CANCELED'
      const suggestion = suggestions.find((item) => item.title.toLowerCase().includes('ferry'))
      if (!suggestion) throw new Error('Ferry Building autocomplete suggestion missing')
      const resolved = await One.iOS.MapServices.resolveSuggestion(suggestion.id)
      if (!resolved.name.toLowerCase().includes('ferry') ||
        Math.abs(resolved.coordinate.latitude - ferry.latitude) >= 0.02 ||
        Math.abs(resolved.coordinate.longitude - ferry.longitude) >= 0.02) {
        throw new Error('Ferry Building suggestion resolved to the wrong place')
      }
      let invalidSuggestion = false
      try {
        await One.iOS.MapServices.resolveSuggestion('unknown-suggestion')
      } catch (error) {
        invalidSuggestion = error !== null && typeof error === 'object' &&
          'code' in error && error.code === 'E_MAP_INPUT'
      }
      if (!canceled || !invalidSuggestion) throw new Error('autocomplete cancellation or input guard failed')
      setStatus('routing')
      const route = await One.iOS.MapServices.directions(ferry, ballpark, 'walking')
      if (route.distanceMeters <= 1000 || route.expectedTravelTimeSeconds <= 0 ||
        route.polyline.length < 2 || route.steps.length < 2) {
        throw new Error('walking route incomplete')
      }
      const empty = await One.iOS.MapServices.search('one-native-conformance-zzzz-999-unfindable', ferry)
      if (empty.length !== 0) throw new Error('unfindable search returned a place')
      let invalid = false
      try {
        await One.iOS.MapServices.search('', ferry)
      } catch (error) {
        invalid = error !== null && typeof error === 'object' &&
          'code' in error && error.code === 'E_MAP_INPUT'
      }
      if (!invalid) throw new Error('invalid search was accepted')
      setStatus(`passed: ${match.name}; ${Math.round(route.distanceMeters)}m; ${route.polyline.length} points; ${route.steps.length} steps; autocomplete=${resolved.name}; canceled=true; invalidSuggestion=E_MAP_INPUT; empty=true; input=E_MAP_INPUT`)
    } catch (error) {
      setStatus(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: 'white' }} testID="one-native-map-services-screen">
      <Text style={{ fontSize: 22 }}>MapKit search and directions</Text>
      <Pressable accessibilityRole="button" testID="one-native-map-services-run" onPress={run}
        style={{ marginTop: 24, padding: 16, backgroundColor: '#DDEEFF' }}>
        <Text>Search and route</Text>
      </Pressable>
      <Text testID="one-native-map-services-result">Map services: {status}</Text>
    </View>
  )
}
