import React, { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native'
import {
  Swift,
  useSizeClass,
  useHinge,
  useReservedRegions,
  type ArrangementViewStyle,
} from '@vxrn/native'

export default function OneNativeArrangementFixture() {
  const sizeClass = useSizeClass()
  const hinge = useHinge()
  const reservedRegions = useReservedRegions()
  const [style, setStyle] = useState<ArrangementViewStyle>('automatic')

  return (
    <View style={styles.container} testID="arrangement-container">
      {/* Top Header / Control Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} testID="header-title">
          ArrangementView & Adaptive
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>H Size:</Text>
            <Text style={styles.badgeValue} testID="size-class-horizontal">
              {sizeClass.horizontal}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>V Size:</Text>
            <Text style={styles.badgeValue} testID="size-class-vertical">
              {sizeClass.vertical}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Hinge:</Text>
            <Text style={styles.badgeValue} testID="hinge-status">
              {hinge?.status ?? 'none'}
            </Text>
          </View>
          {hinge && (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Angle:</Text>
              <Text style={styles.badgeValue} testID="hinge-angle">
                {(hinge.angle * (180 / Math.PI)).toFixed(1)}°
              </Text>
            </View>
          )}
        </View>

        <View style={styles.styleSelector}>
          {(['automatic', 'split', 'overlay'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStyle(s)}
              style={[styles.styleBtn, style === s && styles.styleBtnActive]}
              testID={`style-btn-${s}`}
            >
              <Text style={[styles.styleBtnText, style === s && styles.styleBtnTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Adaptive 2-pane ArrangementView */}
      <Swift.ArrangementView
        arrangementViewStyle={style}
        splitArrangementLayoutRatio={0.5}
        style={styles.arrangement}
        testID="swift-arrangement-view"
      >
        <Swift.ArrangementView.Primary testID="arrangement-primary-pane">
          <View style={[styles.pane, styles.primaryPane]}>
            <Text style={styles.paneTitle}>Leading / Primary</Text>
            <Text style={styles.paneDesc}>
              Adaptive primary container rendered inside SwiftUI ArrangementView.
            </Text>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardTitle}>Window Scene Size Class</Text>
              <Text style={styles.metricLine}>
                Horizontal: <Text style={styles.bold}>{sizeClass.horizontal}</Text>
              </Text>
              <Text style={styles.metricLine}>
                Vertical: <Text style={styles.bold}>{sizeClass.vertical}</Text>
              </Text>
            </View>
          </View>
        </Swift.ArrangementView.Primary>

        <Swift.ArrangementView.Secondary testID="arrangement-secondary-pane">
          <View style={[styles.pane, styles.secondaryPane]}>
            <Text style={styles.paneTitle}>Detail / Secondary</Text>
            <Text style={styles.paneDesc}>
              Adaptive secondary container respecting Duo hinge & fold in Book mode.
            </Text>
            <ScrollView style={styles.regionsScroll}>
              <View style={styles.metricCard}>
                <Text style={styles.metricCardTitle}>
                  Reserved Regions ({reservedRegions.length})
                </Text>
                {reservedRegions.length === 0 ? (
                  <Text style={styles.metricLine}>None reported in current posture.</Text>
                ) : (
                  reservedRegions.map((region, i) => (
                    <View key={`region-${region.kind}-${i}-${region.frame.x}`} style={styles.regionRow}>
                      <Text style={styles.regionKind}>
                        {region.kind} ({region.isActive ? 'active' : 'inactive'})
                      </Text>
                      <Text style={styles.regionFrame}>
                        frame: [{region.frame.x.toFixed(0)}, {region.frame.y.toFixed(0)},{' '}
                        {region.frame.width.toFixed(0)}, {region.frame.height.toFixed(0)}]
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </Swift.ArrangementView.Secondary>
      </Swift.ArrangementView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 4,
  },
  badgeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  styleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  styleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  styleBtnActive: {
    backgroundColor: '#2563EB',
  },
  styleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  styleBtnTextActive: {
    color: '#FFFFFF',
  },
  arrangement: {
    flex: 1,
  },
  pane: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  primaryPane: {
    backgroundColor: '#1E3A8A',
  },
  secondaryPane: {
    backgroundColor: '#064E3B',
  },
  paneTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  paneDesc: {
    fontSize: 13,
    color: '#E2E8F0',
    marginBottom: 14,
    lineHeight: 18,
  },
  metricCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  metricCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 6,
  },
  metricLine: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#38BDF8',
  },
  regionsScroll: {
    flex: 1,
  },
  regionRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  regionKind: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  regionFrame: {
    fontSize: 11,
    color: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
})
