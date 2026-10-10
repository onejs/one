import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useSafeAreaFrame, useSafeAreaInsets, useSizeClass } from 'one'

type ColumnVisibility = 'automatic' | 'all' | 'doubleColumn' | 'detailOnly'

const mailboxes = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'archive', label: 'Archive' },
]
const messages = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'receipt', label: 'Receipt' },
]

export default function OneNativeNavigationSplitViewFixture() {
  const sizeClass = useSizeClass()
  const windowFrame = useSafeAreaFrame()
  const safeAreaInsets = useSafeAreaInsets()
  const [selectedMailboxes, setSelectedMailboxes] = useState<string[]>([])
  const [mailboxProposal, setMailboxProposal] = useState('none')
  const [mailboxSelectionEvents, setMailboxSelectionEvents] = useState<string[]>([])
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [messageProposal, setMessageProposal] = useState('none')
  const [messageSelectionEvents, setMessageSelectionEvents] = useState<string[]>([])
  const [compactColumnEvents, setCompactColumnEvents] = useState<string[]>([])
  const [compactColumn, setCompactColumn] = useState<'sidebar' | 'content' | 'detail'>(
    'sidebar'
  )
  const [compactColumnControlled, setCompactColumnControlled] = useState(true)
  const [acceptCompactColumn, setAcceptCompactColumn] = useState(true)
  const [compactColumnProposal, setCompactColumnProposal] = useState('none')
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    'automatic'
  )
  const [columnVisibilityProposal, setColumnVisibilityProposal] =
    useState<ColumnVisibility | 'none'>('none')
  const [columnVisibilityEvents, setColumnVisibilityEvents] = useState<ColumnVisibility[]>([])
  const [acceptVisibility, setAcceptVisibility] = useState(false)
  const [acceptSelection, setAcceptSelection] = useState(true)
  const [toolbarActions, setToolbarActions] = useState(0)
  const [detailWidth, setDetailWidth] = useState(0)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })
  const [orientationStatus, setOrientationStatus] = useState('pending')

  const lockOrientation = async (orientation: 'landscapeLeft' | 'portrait') => {
    try {
      setOrientationStatus(`locked-${await One.ScreenOrientation.lock(orientation)}`)
    } catch (error) {
      setOrientationStatus(`error-${String(error)}`)
    }
  }

  const selectedMailbox = mailboxes.find((mailbox) => mailbox.id === selectedMailboxes[0])
  const selectedMessage = messages.find((message) => message.id === selectedMessages[0])
  const nativeMetricsHint = JSON.stringify({
    sizeClass,
    windowFrame,
    safeAreaInsets,
    mailboxSelectionEvents,
    messageSelectionEvents,
    columnVisibilityEvents,
    compactColumnEvents,
  })

  return (
    <View
      onLayout={({ nativeEvent }) =>
        setScreenSize({
          width: Math.round(nativeEvent.layout.width),
          height: Math.round(nativeEvent.layout.height),
        })
      }
      style={[
        styles.screen,
        { paddingTop: screenSize.width > screenSize.height ? 0 : 60 },
      ]}
      testID="one-native-navigation-split-view-screen"
    >
      <View style={styles.controls}>
        <Pressable
          onPress={() => setAcceptSelection((value) => !value)}
          testID="one-native-split-view-accept-selection"
        >
          <Text>{`Accept selection: ${acceptSelection}`}</Text>
        </Pressable>
        <Pressable
          onPress={() => setAcceptVisibility((value) => {
            const next = !value
            if (next && columnVisibilityProposal !== 'none')
              setColumnVisibility(columnVisibilityProposal)
            return next
          })}
          testID="one-native-split-view-accept-visibility"
        >
          <Text>{`Accept visibility: ${acceptVisibility}`}</Text>
        </Pressable>
        <Pressable
          onPress={() => setAcceptCompactColumn((value) => {
            const next = !value
            if (next && compactColumnProposal !== 'none')
              setCompactColumn(compactColumnProposal)
            return next
          })}
          testID="one-native-split-view-accept-compact"
        >
          <Text>{`Accept compact: ${acceptCompactColumn}`}</Text>
        </Pressable>
        <Pressable
          onPress={() => setColumnVisibility('all')}
          testID="one-native-split-view-toggle-visibility"
        >
          <Text>{`Visibility control: ${columnVisibility}`}</Text>
        </Pressable>
        <Pressable
          onPress={() => setCompactColumnControlled((value) => !value)}
          testID="one-native-split-view-toggle-compact-control"
        >
          <Text>{`Compact control: ${compactColumnControlled}`}</Text>
        </Pressable>
        <Pressable
          onPress={() => void lockOrientation('landscapeLeft')}
          testID="one-native-split-view-landscape"
        >
          <Text>Landscape</Text>
        </Pressable>
        <Pressable
          onPress={() => void lockOrientation('portrait')}
          testID="one-native-split-view-portrait"
        >
          <Text>Portrait</Text>
        </Pressable>
      </View>

      <View style={styles.status}>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-selection"
        >{`Mailbox: ${selectedMailbox?.id ?? 'none'}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-selection-proposal"
        >{`Mailbox proposal: ${mailboxProposal}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-message-proposal"
        >{`Message proposal: ${messageProposal}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-selected-message"
        >{`Selected message: ${selectedMessage?.id ?? 'none'}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-message-selection-events"
        >{`Message events: ${messageSelectionEvents.length ? messageSelectionEvents.join('>') : 'none'}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-compact-column"
        >{`Compact column: ${compactColumn}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-compact-proposal"
        >{`Compact proposal: ${compactColumnProposal}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-visibility"
        >{`Visibility: ${columnVisibility}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-visibility-proposal"
        >{`Visibility proposal: ${columnVisibilityProposal}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-native-metrics"
          accessibilityHint={nativeMetricsHint}
        >{`Orientation: ${orientationStatus}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-toolbar-actions"
        >{`Toolbar actions: ${toolbarActions}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-detail-width"
        >{`Detail width: ${detailWidth}`}</Text>
        <Text
          style={styles.statusText}
          testID="one-native-split-view-screen-size"
        >{`Screen: ${screenSize.width}x${screenSize.height}`}</Text>
      </View>

      <One.iOS.NavigationSplitView
        style={styles.splitView}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={(next) => {
          setColumnVisibilityProposal(next)
          setColumnVisibilityEvents((events) => [...events, next])
          if (acceptVisibility) setColumnVisibility(next)
        }}
        preferredCompactColumn={compactColumnControlled ? compactColumn : undefined}
        onPreferredCompactColumnChange={(next) => {
          setCompactColumnProposal(next)
          setCompactColumnEvents((events) => [...events, next])
          if (acceptCompactColumn) setCompactColumn(next)
        }}
      >
        <One.iOS.NavigationSplitView.Sidebar
          swiftStyle={{
            navigationTitleWithText: 'Mailboxes',
            navigationSplitViewColumnWidthWithCGFloat: 210,
          }}
        >
          <One.iOS.Toolbar>
            <View
              style={styles.columnFrame}
              testID="one-native-split-view-sidebar-frame"
            >
              <One.iOS.List
                listStyle="sidebar"
                selection={selectedMailboxes}
                onSelectionChange={(next) => {
                  setMailboxProposal(next[0] ?? 'none')
                  setMailboxSelectionEvents((events) => [
                    ...events,
                    next.length ? next.join(',') : 'none',
                  ])
                  if (acceptSelection) {
                    setSelectedMailboxes(next)
                    if (acceptCompactColumn) setCompactColumn(next.length ? 'content' : 'sidebar')
                  }
                }}
              >
                {mailboxes.map((mailbox) => (
                  <One.iOS.Text
                    key={mailbox.id}
                    testID={`one-native-split-view-mailbox-${mailbox.id}`}
                    text={mailbox.label}
                    swiftStyle={{ tag: mailbox.id }}
                  />
                ))}
              </One.iOS.List>
            </View>
            <One.iOS.Toolbar.Content>
              <One.iOS.ToolbarItem placement="topBarTrailing">
                <One.iOS.Button
                  label="Add mailbox"
                  onPress={() => setToolbarActions((count) => count + 1)}
                />
              </One.iOS.ToolbarItem>
            </One.iOS.Toolbar.Content>
          </One.iOS.Toolbar>
        </One.iOS.NavigationSplitView.Sidebar>

        <One.iOS.NavigationSplitView.Content
          swiftStyle={{
            navigationTitleWithText: selectedMailbox?.label ?? 'Messages',
            navigationSplitViewColumnWidthWithCGFloat: 240,
          }}
        >
          <One.iOS.Toolbar>
            <View
              style={styles.columnFrame}
              testID="one-native-split-view-content-frame"
            >
              <One.iOS.List
                selection={selectedMessages}
                onSelectionChange={(next) => {
                  setMessageProposal(next[0] ?? 'none')
                  setMessageSelectionEvents((events) => [
                    ...events,
                    next.length ? next.join(',') : 'none',
                  ])
                  if (acceptSelection) {
                    setSelectedMessages(next)
                    if (acceptCompactColumn) setCompactColumn(next.length ? 'detail' : 'content')
                  }
                }}
              >
                {messages.map((message) => (
                  <One.iOS.Text
                    key={message.id}
                    testID={`one-native-split-view-message-${message.id}`}
                    text={message.label}
                    swiftStyle={{ tag: message.id }}
                  />
                ))}
              </One.iOS.List>
            </View>
            <One.iOS.Toolbar.Content>
              <One.iOS.ToolbarItem placement="topBarTrailing">
                <One.iOS.Button
                  label="Compose"
                  onPress={() => setToolbarActions((count) => count + 1)}
                />
              </One.iOS.ToolbarItem>
            </One.iOS.Toolbar.Content>
          </One.iOS.Toolbar>
        </One.iOS.NavigationSplitView.Content>

        <One.iOS.NavigationSplitView.Detail
          swiftStyle={{
            navigationTitleWithText: selectedMessage?.label ?? 'Message',
            navigationSplitViewColumnWidthWithCGFloat: 300,
          }}
        >
          <One.iOS.Toolbar>
            <View
              style={styles.columnFrame}
              testID="one-native-split-view-detail-frame"
            >
              <View
                onLayout={({ nativeEvent }) =>
                  setDetailWidth(Math.round(nativeEvent.layout.width))
                }
                style={styles.detail}
              >
                <Text testID="one-native-split-view-message">
                  {`Message: ${selectedMessage?.id ?? 'none'}`}
                </Text>
              </View>
            </View>
            <One.iOS.Toolbar.Content>
              <One.iOS.ToolbarItem placement="topBarTrailing">
                <One.iOS.Button
                  label="Flag"
                  onPress={() => setToolbarActions((count) => count + 1)}
                />
              </One.iOS.ToolbarItem>
            </One.iOS.Toolbar.Content>
          </One.iOS.Toolbar>
        </One.iOS.NavigationSplitView.Detail>
      </One.iOS.NavigationSplitView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 60 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12 },
  status: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11 },
  splitView: { flex: 1 },
  columnFrame: { flex: 1 },
  detail: { height: 44, width: '100%' },
})
