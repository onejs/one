import { Color } from '@vxrn/native'
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native'

// ios system colors to test
const iosSystemColors = [
  { name: 'systemBlue', key: 'systemBlue' },
  { name: 'systemRed', key: 'systemRed' },
  { name: 'systemGreen', key: 'systemGreen' },
  { name: 'systemOrange', key: 'systemOrange' },
  { name: 'systemPurple', key: 'systemPurple' },
  { name: 'systemPink', key: 'systemPink' },
  { name: 'systemYellow', key: 'systemYellow' },
  { name: 'systemTeal', key: 'systemTeal' },
  { name: 'systemIndigo', key: 'systemIndigo' },
  { name: 'systemCyan', key: 'systemCyan' },
  { name: 'systemMint', key: 'systemMint' },
  { name: 'systemBrown', key: 'systemBrown' },
] as const

// ios semantic colors
const iosSemanticColors = [
  { name: 'label', key: 'label' },
  { name: 'secondaryLabel', key: 'secondaryLabel' },
  { name: 'tertiaryLabel', key: 'tertiaryLabel' },
  { name: 'systemFill', key: 'systemFill' },
  { name: 'separator', key: 'separator' },
  { name: 'link', key: 'link' },
] as const

// ios gray scale
const iosGrayColors = [
  { name: 'systemGray', key: 'systemGray' },
  { name: 'systemGray2', key: 'systemGray2' },
  { name: 'systemGray3', key: 'systemGray3' },
  { name: 'systemGray4', key: 'systemGray4' },
  { name: 'systemGray5', key: 'systemGray5' },
  { name: 'systemGray6', key: 'systemGray6' },
] as const

// ios background colors
const iosBackgroundColors = [
  { name: 'systemBackground', key: 'systemBackground' },
  { name: 'secondarySystemBackground', key: 'secondarySystemBackground' },
  { name: 'tertiarySystemBackground', key: 'tertiarySystemBackground' },
] as const

export default function ColorTestScreen() {
  const isIOS = Platform.OS === 'ios'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="color-test-screen"
    >
      <Text testID="color-test-title" style={styles.title}>
        Color API Test
      </Text>

      <Text testID="color-test-platform" style={styles.sectionLabel}>
        Platform: {Platform.OS}
      </Text>

      {/* ios system colors */}
      <Text testID="section-system-colors" style={styles.sectionTitle}>
        iOS System Colors
      </Text>
      <View style={styles.colorGrid} testID="system-colors-grid">
        {iosSystemColors.map((color) => (
          <View key={color.key} style={styles.colorItem}>
            <View
              testID={`color-box-${color.key}`}
              style={[
                styles.colorBox,
                {
                  backgroundColor: isIOS
                    ? (Color.ios[color.key as keyof typeof Color.ios] as any)
                    : '#ccc',
                },
              ]}
            />
            <Text testID={`color-label-${color.key}`} style={styles.colorLabel}>
              {color.name}
            </Text>
          </View>
        ))}
      </View>

      {/* ios gray scale */}
      <Text testID="section-gray-colors" style={styles.sectionTitle}>
        iOS Gray Scale
      </Text>
      <View style={styles.colorGrid} testID="gray-colors-grid">
        {iosGrayColors.map((color) => (
          <View key={color.key} style={styles.colorItem}>
            <View
              testID={`color-box-${color.key}`}
              style={[
                styles.colorBox,
                {
                  backgroundColor: isIOS
                    ? (Color.ios[color.key as keyof typeof Color.ios] as any)
                    : '#ccc',
                },
              ]}
            />
            <Text testID={`color-label-${color.key}`} style={styles.colorLabel}>
              {color.name}
            </Text>
          </View>
        ))}
      </View>

      {/* ios semantic colors */}
      <Text testID="section-semantic-colors" style={styles.sectionTitle}>
        iOS Semantic Colors
      </Text>
      <View style={styles.colorGrid} testID="semantic-colors-grid">
        {iosSemanticColors.map((color) => (
          <View key={color.key} style={styles.colorItem}>
            <View
              testID={`color-box-${color.key}`}
              style={[
                styles.colorBox,
                {
                  backgroundColor: isIOS
                    ? (Color.ios[color.key as keyof typeof Color.ios] as any)
                    : '#ccc',
                },
              ]}
            />
            <Text testID={`color-label-${color.key}`} style={styles.colorLabel}>
              {color.name}
            </Text>
          </View>
        ))}
      </View>

      {/* ios background colors */}
      <Text testID="section-background-colors" style={styles.sectionTitle}>
        iOS Background Colors
      </Text>
      <View style={styles.colorGrid} testID="background-colors-grid">
        {iosBackgroundColors.map((color) => (
          <View key={color.key} style={styles.colorItem}>
            <View
              testID={`color-box-${color.key}`}
              style={[
                styles.colorBox,
                styles.colorBoxBordered,
                {
                  backgroundColor: isIOS
                    ? (Color.ios[color.key as keyof typeof Color.ios] as any)
                    : '#ccc',
                },
              ]}
            />
            <Text testID={`color-label-${color.key}`} style={styles.colorLabel}>
              {color.name}
            </Text>
          </View>
        ))}
      </View>

      {/* render status */}
      <View testID="color-render-status" style={styles.statusBar}>
        <Text testID="color-render-complete" style={styles.statusText}>
          Color render complete
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 140,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorItem: {
    alignItems: 'center',
    width: 70,
  },
  colorBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  colorBoxBordered: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorLabel: {
    fontSize: 9,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  statusBar: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
})
