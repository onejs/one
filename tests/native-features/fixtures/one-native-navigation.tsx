import { useState } from 'react'
import { Swift } from '@vxrn/native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// a sheet whose root is a real SwiftUI NavigationStack: the navigation bar carries a
// segmented principal Picker that switches the React Native page under it, and a trailing
// close button that dismisses the sheet.
export default function OneNativeNavigation() {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState('inbox')
  const [taps, setTaps] = useState(0)
  const [sort, setSort] = useState(0)
  const [closes, setCloses] = useState(0)

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={styles.open}
        testID="one-native-navigation-open"
      >
        <Text style={styles.openText}>Open stack sheet</Text>
      </Pressable>

      <Text
        style={styles.status}
        testID="one-native-navigation-page"
      >{`Page: ${page}`}</Text>
      <Text
        style={styles.status}
        testID="one-native-navigation-closes"
      >{`Closes: ${closes}`}</Text>
      <Text
        style={styles.status}
        testID="one-native-navigation-sort"
      >{`Sort: ${sort}`}</Text>

      <Swift.Sheet
        isPresented={open}
        onIsPresentedChange={setOpen}
        onDismiss={() => setCloses((count) => count + 1)}
        presentationDetents={['large']}
      >
        <Swift.NavigationStack
          style={styles.stack}
          swiftStyle={{
            navigationTitleWithText: 'Mailbox',
            navigationBarTitleDisplayMode: 'inline',
          }}
        >
          <Swift.Toolbar>
            <Swift.ToolbarItem placement="principal">
              <Swift.Picker
                label="Mailbox"
                pickerStyle="segmented"
                selection={page}
                onSelectionChange={setPage}
                options={[
                  { value: 'inbox', label: 'Inbox' },
                  { value: 'archive', label: 'Archive' },
                ]}
              />
            </Swift.ToolbarItem>
            <Swift.ToolbarItemGroup
              placement="topBarLeading"
              label="Sort"
              systemImage="arrow.up.arrow.down"
            >
              <Swift.Button
                label="Newest"
                onPress={() => setSort((count) => count + 1)}
              />
            </Swift.ToolbarItemGroup>
            <Swift.ToolbarSpacer sizing="fixed" placement="topBarLeading" />
            <Swift.ToolbarItem placement="topBarTrailing">
              <Swift.Button
                label="Close"
                systemImage="xmark"
                buttonRole="close"
                onPress={() => setOpen(false)}
              />
            </Swift.ToolbarItem>
          </Swift.Toolbar>

          <View style={styles.page}>
            <Text style={styles.pageText} testID="one-native-navigation-stack-page">
              {page === 'inbox' ? 'Inbox page' : 'Archive page'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setTaps((count) => count + 1)}
              style={styles.tap}
              testID="one-native-navigation-tap"
            >
              <Text style={styles.tapText}>{`Taps: ${taps}`}</Text>
            </Pressable>
          </View>
        </Swift.NavigationStack>
      </Swift.Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 16,
    padding: 24,
  },
  open: {
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    padding: 12,
  },
  openText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 15,
  },
  stack: {
    flex: 1,
  },
  page: {
    flex: 1,
    gap: 16,
    padding: 24,
  },
  pageText: {
    fontSize: 20,
    fontWeight: '600',
  },
  tap: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tapText: {
    fontSize: 16,
  },
})
