import { useState, type ReactElement } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import type { SiriTipViewProps } from './types'

export type { SiriTipViewProps } from './types'

export function SiriTipView({
  phrase,
  intentId,
  visible = true,
  style,
  siriTipViewStyle = 'automatic',
  onDismiss,
}: SiriTipViewProps): ReactElement | null {
  if (Platform.OS !== 'ios') {
    throw new Error('Swift.SiriTipView requires an iOS native build')
  }
  const [dismissed, setDismissed] = useState(false)
  if (!visible || dismissed) return null

  const isDark = siriTipViewStyle === 'dark'
  const label = phrase ?? (intentId ? `"Run ${intentId}"` : '"Ask Siri"')

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
        style,
      ]}
      testID="one-ios-siri-tip-view"
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Siri</Text>
      </View>
      <View style={styles.textGroup}>
        <Text style={[styles.caption, isDark && styles.captionDark]}>Say to Siri</Text>
        <Text
          numberOfLines={2}
          style={[styles.phrase, isDark && styles.phraseDark]}
        >
          {label}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Dismiss Siri Tip"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          setDismissed(true)
          onDismiss?.()
        }}
        style={styles.dismissButton}
      >
        <Text style={[styles.dismissText, isDark && styles.dismissTextDark]}>×</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  containerLight: {
    backgroundColor: 'rgba(120, 120, 128, 0.12)',
    borderColor: 'rgba(60, 60, 67, 0.18)',
  },
  containerDark: {
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5E5CE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(60, 60, 67, 0.6)',
  },
  captionDark: {
    color: 'rgba(235, 235, 245, 0.6)',
  },
  phrase: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  phraseDark: {
    color: '#FFFFFF',
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 18,
    lineHeight: 20,
    color: 'rgba(60, 60, 67, 0.6)',
  },
  dismissTextDark: {
    color: 'rgba(235, 235, 245, 0.6)',
  },
})
