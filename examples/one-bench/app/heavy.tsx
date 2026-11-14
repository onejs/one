import React, { useEffect } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Bench } from '../native/Bench/Bench.swift'
import { navigationReady } from '../bench/navigation'
export default function Heavy() {
  useEffect(() => { Bench.frame().then(navigationReady) }, [])
  return <ScrollView style={{ backgroundColor: '#fff', paddingTop: 64 }}>
    {Array.from({ length: 1000 }, (_, i) => <View key={i} collapsable={false} style={{ padding: 4 }}><Text>Heavy screen row {i}</Text></View>)}
  </ScrollView>
}
