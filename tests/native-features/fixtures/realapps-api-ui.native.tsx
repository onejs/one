import { useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  One,
  useSafeAreaInsets,
  useSizeClass,
  useReservedRegions,
  useReservedRegionsReady,
  type PagerRef,
} from 'one'
import {
  Action,
  Boundary,
  Results,
  assert,
  useResults,
  type Report,
} from './realapps-api-report'

const apis = [
  'One.UI.SafeArea',
  'useSafeAreaInsets',
  'useSizeClass',
  'One.UI.ReservedRegions',
  'One.UI.Blur',
  'One.UI.Mask',
  'One.UI.EdgeFade',
  'One.UI.Pager',
  'One.UI.Portal',
  'One.UI.PortalHost',
  'One.UI.Image',
]

function Geometry({ report }: { report: Report }) {
  const insets = useSafeAreaInsets()
  const size = useSizeClass()
  useEffect(() => {
    const validInsets = Object.values(insets).every(
      (value) => Number.isFinite(value) && value >= 0
    )
    report(
      'useSafeAreaInsets',
      validInsets ? 'passed' : 'failed',
      insets,
      'numeric native metrics read'
    )
    report(
      'useSizeClass',
      ['compact', 'regular', 'unspecified'].includes(size.horizontal) &&
        ['compact', 'regular', 'unspecified'].includes(size.vertical)
        ? 'passed'
        : 'failed',
      size,
      'native size-class metrics read'
    )
  }, [
    insets.top,
    insets.bottom,
    insets.left,
    insets.right,
    size.horizontal,
    size.vertical,
    report,
  ])
  return (
    <One.UI.SafeArea.View
      testID="realapps-api-safe-view"
      onLayout={({ nativeEvent }) =>
        report(
          'One.UI.SafeArea',
          'observed',
          nativeEvent.layout,
          'native safe-area content mounted and laid out'
        )
      }
      style={{ minHeight: 60 }}
    >
      <Text testID="realapps-api-safe-content">Safe content</Text>
    </One.UI.SafeArea.View>
  )
}

function Regions({ report }: { report: Report }) {
  const regions = useReservedRegions()
  const ready = useReservedRegionsReady()
  useEffect(() => {
    if (!ready) return
    report(
      'One.UI.ReservedRegions',
      regions.every((region) => Object.values(region.frame).every(Number.isFinite))
        ? 'passed'
        : 'failed',
      { ready, regions },
      'native provider event received; empty regions allowed on flat device'
    )
  }, [regions, ready, report])
  return <Text>Reserved regions ready: {String(ready)}</Text>
}

// deterministic 1x1 png; no remote service dependency.
const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='
export default function SharedUI() {
  const { results, report } = useResults(apis)
  const pager = useRef<PagerRef>(null)
  const expectedPage = useRef<number | null>(null)
  const [portal, setPortal] = useState(true)
  const [mask, setMask] = useState(true)
  const [blur, setBlur] = useState(80)
  const [hits, setHits] = useState(0)
  return (
    <ScrollView testID="realapps-api-ui" contentContainerStyle={{ padding: 12, gap: 8 }}>
      <Results results={results} />
      <Boundary api="One.UI.SafeArea" report={report}>
        <Geometry report={report} />
      </Boundary>
      {
        <Boundary api="One.UI.ReservedRegions" report={report}>
          <One.UI.ReservedRegions.Provider style={{ height: 60 }}>
            <Regions report={report} />
          </One.UI.ReservedRegions.Provider>
        </Boundary>
      }
      <Boundary api="One.UI.Blur" report={report}>
        <View style={{ height: 70, backgroundColor: '#147' }}>
          <Text style={{ fontSize: 30 }}>BLUR STRIPES |||||</Text>
          <One.UI.Blur
            testID="realapps-api-blur"
            intensity={blur}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </View>
      </Boundary>
      <Action
        id="blur-toggle"
        onPress={() => {
          const next = blur === 80 ? 0 : 80
          setBlur(next)
          report(
            'One.UI.Blur',
            'observed',
            { intensity: next },
            'runner captures baseline and blurred pixels'
          )
        }}
      >
        Toggle native blur
      </Action>
      <Boundary api="One.UI.Mask" report={report}>
        <One.UI.Mask
          testID="realapps-api-mask"
          style={{ height: 60 }}
          maskElement={
            <View
              style={{
                width: mask ? '50%' : '100%',
                height: 60,
                backgroundColor: '#000',
              }}
            />
          }
        >
          <View style={{ flex: 1, backgroundColor: '#e43' }}>
            <Text>Masked rectangle</Text>
          </View>
        </One.UI.Mask>
      </Boundary>
      <Action
        id="mask-toggle"
        onPress={() => {
          setMask(!mask)
          report(
            'One.UI.Mask',
            'observed',
            { half: !mask },
            'native mask toggled; captures retain half/full state'
          )
        }}
      >
        Toggle native mask
      </Action>
      <Boundary api="One.UI.EdgeFade" report={report}>
        <One.UI.EdgeFade
          testID="realapps-api-edgefade"
          mode="mask"
          curve="linear"
          top={20}
          bottom={20}
          style={{ height: 60 }}
        >
          <View
            style={{ height: 60, backgroundColor: '#e43' }}
            onLayout={({ nativeEvent }) =>
              report(
                'One.UI.EdgeFade',
                'observed',
                nativeEvent.layout,
                'native mask mounted; receipt retains baseline screenshot'
              )
            }
          >
            <Text>Native edge fade</Text>
          </View>
        </One.UI.EdgeFade>
      </Boundary>
      <Boundary api="One.UI.Pager" report={report}>
        <One.UI.Pager
          testID="realapps-api-pager"
          ref={pager}
          style={{ height: 140 }}
          initialPage={0}
          onPageSelected={({ nativeEvent }) => {
            const expected = expectedPage.current
            report(
              'One.UI.Pager',
              expected === null
                ? 'observed'
                : nativeEvent.position === expected
                  ? 'passed'
                  : 'failed',
              { event: nativeEvent, expected },
              'native selection callbacks; runner selects page one and returns'
            )
          }}
        >
          <View key="0" collapsable={false} style={{ backgroundColor: '#cef' }}>
            <Text testID="realapps-api-page-zero">Page zero</Text>
          </View>
          <View key="1" collapsable={false} style={{ backgroundColor: '#fec' }}>
            <Text testID="realapps-api-page-one">Page one</Text>
          </View>
        </One.UI.Pager>
      </Boundary>
      <Action
        id="pager-next"
        onPress={() => {
          expectedPage.current = 1
          report('One.UI.Pager', 'running')
          pager.current?.setPage(1)
        }}
      >
        Select page one
      </Action>
      <Action
        id="pager-back"
        onPress={() => {
          expectedPage.current = 0
          report('One.UI.Pager', 'running')
          pager.current?.setPageWithoutAnimation(0)
        }}
      >
        Return page zero
      </Action>
      <Boundary api="One.UI.PortalHost" report={report}>
        <One.UI.PortalHost
          name="realapps-api-host"
          testID="realapps-api-portal-host"
          style={{ height: 60 }}
        />
      </Boundary>
      <Boundary api="One.UI.Portal" report={report}>
        {portal ? (
          <One.UI.Portal
            hostName="realapps-api-host"
            name="probe"
            testID="realapps-api-portal"
          >
            <Action
              id="portal-hit"
              onPress={() => {
                const next = hits + 1
                setHits(next)
                report(
                  'One.UI.Portal',
                  'passed',
                  { hits: next },
                  'native reparented child received touch'
                )
                report(
                  'One.UI.PortalHost',
                  'passed',
                  { hits: next },
                  'named host contains touchable child'
                )
              }}
            >
              Portal hit {hits}
            </Action>
          </One.UI.Portal>
        ) : null}
      </Boundary>
      <Action
        id="portal-toggle"
        onPress={() => {
          setPortal(!portal)
          report(
            'One.UI.Portal',
            'observed',
            { mounted: !portal },
            'runner proves child removal and remount'
          )
        }}
      >
        Toggle portal child
      </Action>
      <Boundary api="One.UI.Image" report={report}>
        <One.UI.Image
          testID="realapps-api-image"
          source={pixel}
          style={{ width: 60, height: 60 }}
          onLoad={({ nativeEvent }) =>
            report(
              'One.UI.Image',
              nativeEvent.source.width === 1 && nativeEvent.source.height === 1
                ? 'passed'
                : 'failed',
              nativeEvent
            )
          }
          onError={({ nativeEvent }) => report('One.UI.Image', 'failed', nativeEvent)}
        />
      </Boundary>
    </ScrollView>
  )
}
