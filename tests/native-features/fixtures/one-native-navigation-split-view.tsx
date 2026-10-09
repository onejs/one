import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const mailboxes = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'archive', label: 'Archive' },
]
const messages = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'receipt', label: 'Receipt' },
]

export default function OneNativeNavigationSplitViewFixture() {
  const [selectedMailboxes, setSelectedMailboxes] = useState(['inbox'])
  const [mailboxProposal, setMailboxProposal] = useState('none')
  const [selectedMessages, setSelectedMessages] = useState(['welcome'])
  const [messageProposal, setMessageProposal] = useState('none')
  const [compactColumn, setCompactColumn] = useState<'sidebar' | 'content' | 'detail'>(
    'sidebar'
  )
  const [compactColumnControlled, setCompactColumnControlled] = useState(true)
  const [compactColumnProposal, setCompactColumnProposal] = useState('none')
  const [columnVisibility, setColumnVisibility] = useState<'automatic' | 'all'>(
    'automatic'
  )
  const [acceptSelection, setAcceptSelection] = useState(true)
  const [toolbarActions, setToolbarActions] = useState(0)
  const [detailWidth, setDetailWidth] = useState(0)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  const selectedMailbox = mailboxes.find((mailbox) => mailbox.id === selectedMailboxes[0])
  const selectedMessage = messages.find((message) => message.id === selectedMessages[0])

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
          onPress={() =>
            setColumnVisibility((value) => (value === 'all' ? 'automatic' : 'all'))
          }
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
          onPress={() => {
            void One.ScreenOrientation.lock('landscapeLeft')
          }}
          testID="one-native-split-view-landscape"
        >
          <Text>Landscape</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void One.ScreenOrientation.lock('portrait')
          }}
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
        onColumnVisibilityChange={setColumnVisibility}
        preferredCompactColumn={compactColumnControlled ? compactColumn : undefined}
        onPreferredCompactColumnChange={(next) => {
          setCompactColumnProposal(next)
          if (acceptSelection) setCompactColumn(next)
        }}
      >
        <One.iOS.NavigationSplitView.Sidebar
          swiftStyle={{
            navigationTitleWithText: 'Mailboxes',
            navigationSplitViewColumnWidthWithCGFloat: 210,
          }}
        >
          <One.iOS.Toolbar>
            <One.iOS.List
              listStyle="sidebar"
              selection={selectedMailboxes}
              onSelectionChange={(next) => {
                setMailboxProposal(next[0] ?? 'none')
                if (acceptSelection) setSelectedMailboxes(next)
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
            <One.iOS.List
              selection={selectedMessages}
              onSelectionChange={(next) => {
                setMessageProposal(next[0] ?? 'none')
                if (acceptSelection) {
                  setSelectedMessages(next)
                  setCompactColumn('detail')
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
              onLayout={({ nativeEvent }) =>
                setDetailWidth(Math.round(nativeEvent.layout.width))
              }
              style={styles.detail}
              testID="one-native-split-view-detail-frame"
            >
              <Text testID="one-native-split-view-message">
                {`Message: ${selectedMessage?.id ?? 'none'}`}
              </Text>
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
  detail: { height: 44, width: '100%' },
})
