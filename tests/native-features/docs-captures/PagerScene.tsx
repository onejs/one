import { useState } from 'react'
import { One } from 'one'
import { Text, View } from 'react-native'

const pages = [
  { key: 'today', title: 'Today', detail: '3 events', color: '#3b82f6' },
  { key: 'inbox', title: 'Inbox', detail: '12 unread', color: '#ec4899' },
  { key: 'photos', title: 'Photos', detail: '248 items', color: '#10b981' },
  { key: 'files', title: 'Files', detail: '4 folders', color: '#8b5cf6' },
]

// a rounded screen holding full-bleed pages, so the pager's clip is the screen's edge.
export function PagerScene() {
  const [progress, setProgress] = useState(1)
  return (
    <View
      style={{
        width: 300,
        height: 420,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      <One.UI.Pager
        style={{ flex: 1 }}
        initialPage={1}
        pageMargin={12}
        onPageScroll={({ nativeEvent }) =>
          setProgress(nativeEvent.position + nativeEvent.offset)
        }
      >
        {pages.map((page) => (
          <View
            key={page.key}
            style={{ backgroundColor: page.color, padding: 28, paddingTop: 36, gap: 6 }}
          >
            <Text style={{ fontSize: 34, fontWeight: '800', color: 'white' }}>
              {page.title}
            </Text>
            <Text
              style={{ fontSize: 17, fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}
            >
              {page.detail}
            </Text>
            <View style={{ flex: 1 }} />
            {[1, 0.75, 0.5].map((width) => (
              <View
                key={width}
                style={{
                  height: 44,
                  width: `${width * 100}%`,
                  borderRadius: 14,
                  marginTop: 10,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                }}
              />
            ))}
            <View style={{ height: 40 }} />
          </View>
        ))}
      </One.UI.Pager>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 22,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 7,
        }}
      >
        {pages.map((page, index) => {
          const near = Math.max(0, 1 - Math.abs(index - progress))
          return (
            <View
              key={page.key}
              style={{
                width: 8 + 18 * near,
                height: 8,
                borderRadius: 4,
                backgroundColor: 'white',
                opacity: 0.45 + 0.55 * near,
              }}
            />
          )
        })}
      </View>
    </View>
  )
}
