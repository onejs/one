import { useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { One, type ScrollViewProxy } from 'one'
import { initialChats, makeMessages, type Chat, type Message } from './data'

const rowItems = [
  { type: 'action', id: 'open', title: 'Open', systemImage: 'bubble.left' },
  { type: 'action', id: 'copy', title: 'Copy name', systemImage: 'doc.on.doc' },
  { type: 'divider', id: 'divider' },
  { type: 'action', id: 'delete', title: 'Delete', role: 'destructive' },
] as const

const attachItems = [
  { type: 'action', id: 'photo', title: 'Photo', systemImage: 'photo' },
  { type: 'action', id: 'file', title: 'File', systemImage: 'doc' },
  { type: 'action', id: 'location', title: 'Location', systemImage: 'location' },
] as const

const bubbleHeight = (message: Message) => 22 + Math.ceil(message.text.length / 34) * 20

export function useChats() {
  const [chats, setChats] = useState(initialChats)
  const update = (id: string, patch: Partial<Chat>) =>
    setChats((all) => all.map((chat) => (chat.id === id ? { ...chat, ...patch } : chat)))
  const remove = (id: string) => setChats((all) => all.filter((chat) => chat.id !== id))
  const unread = chats.reduce((sum, chat) => sum + (chat.muted ? 0 : chat.unread), 0)
  return { chats, update, remove, unread }
}

type ChatsApi = ReturnType<typeof useChats>

export function ChatsTab({ api }: { api: ChatsApi }) {
  const { chats, update, remove } = api
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Chat | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [draftTo, setDraftTo] = useState('')
  const [refreshes, setRefreshes] = useState(0)
  const visible = useMemo(
    () => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())),
    [chats, query]
  )
  const refresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    setRefreshes((count) => count + 1)
  }

  const onRowAction = (chat: Chat, action: string) => {
    if (action === 'open') setOpen(chat)
    if (action === 'delete') remove(chat.id)
  }

  return (
    <One.iOS.NavigationStack
      style={styles.flex}
      swiftStyle={{
        navigationTitleWithText: open ? open.name : 'Chats',
        navigationBarTitleDisplayMode: 'inline',
        navigationBarBackButtonHidden: !!open,
        ...(open ? {} : { searchable: { value: query, onChange: setQuery } }),
      }}
    >
      <One.iOS.Toolbar>
        {open ? (
          <One.iOS.ToolbarItem placement="topBarLeading">
            <One.iOS.Button
              label="Back"
              systemImage="chevron.left"
              testID="chat-stress-back"
              onPress={() => setOpen(null)}
            />
          </One.iOS.ToolbarItem>
        ) : (
          <One.iOS.ToolbarItem placement="topBarTrailing">
            <One.iOS.Button
              label="Compose"
              systemImage="square.and.pencil"
              testID="chat-stress-compose"
              onPress={() => setComposeOpen(true)}
            />
          </One.iOS.ToolbarItem>
        )}
      </One.iOS.Toolbar>
      {open ? (
        <Conversation chat={open} key={open.id} />
      ) : (
        <One.iOS.List
          listStyle="plain"
          style={styles.flex}
          swiftStyle={{ refreshable: refresh }}
          testID="chat-stress-chat-list"
        >
          <One.iOS.Section title={`Chats (${visible.length}), refreshed ${refreshes}`}>
            {visible.map((chat) => (
              <One.iOS.SwipeActions key={chat.id}>
                <One.iOS.Slot height={64}>
                  <One.iOS.ContextMenu
                    items={rowItems}
                    testID={`chat-stress-row-menu-${chat.id}`}
                    onAction={(action) => onRowAction(chat, action)}
                  >
                    <ChatRow chat={chat} onPress={() => setOpen(chat)} />
                  </One.iOS.ContextMenu>
                </One.iOS.Slot>
                <One.iOS.SwipeActions.Actions edge="leading" allowsFullSwipe={false}>
                  <One.iOS.Button
                    label={chat.unread ? 'Read' : 'Unread'}
                    systemImage="envelope.badge"
                    testID={`chat-stress-read-${chat.id}`}
                    onPress={() => update(chat.id, { unread: chat.unread ? 0 : 1 })}
                  />
                  <One.iOS.Button
                    label={chat.pinned ? 'Unpin' : 'Pin'}
                    systemImage="pin"
                    testID={`chat-stress-pin-${chat.id}`}
                    onPress={() => update(chat.id, { pinned: !chat.pinned })}
                  />
                </One.iOS.SwipeActions.Actions>
                <One.iOS.SwipeActions.Actions edge="trailing">
                  <One.iOS.Button
                    label={chat.muted ? 'Unmute' : 'Mute'}
                    systemImage="bell.slash"
                    testID={`chat-stress-mute-${chat.id}`}
                    onPress={() => update(chat.id, { muted: !chat.muted })}
                  />
                  <One.iOS.Button
                    label="Delete"
                    systemImage="trash"
                    buttonRole="destructive"
                    testID={`chat-stress-delete-${chat.id}`}
                    onPress={() => remove(chat.id)}
                  />
                </One.iOS.SwipeActions.Actions>
              </One.iOS.SwipeActions>
            ))}
          </One.iOS.Section>
        </One.iOS.List>
      )}
      <One.iOS.Sheet
        isPresented={composeOpen}
        onIsPresentedChange={setComposeOpen}
        presentationDetents={['medium', 'large']}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>New message</Text>
          <TextInput
            testID="chat-stress-compose-to"
            style={styles.toField}
            placeholder="To:"
            value={draftTo}
            onChangeText={setDraftTo}
          />
          <Pressable
            testID="chat-stress-compose-close"
            style={styles.sheetButton}
            onPress={() => setComposeOpen(false)}
          >
            <Text style={styles.sheetButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </One.iOS.Sheet>
    </One.iOS.NavigationStack>
  )
}

function ChatRow({ chat, onPress }: { chat: Chat; onPress: () => void }) {
  return (
    <Pressable testID={`chat-stress-row-${chat.id}`} style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{chat.name[0]}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >{`${chat.pinned ? '📌 ' : ''}${chat.name}`}</Text>
          <Text style={styles.time}>{chat.time}</Text>
        </View>
        <Text
          style={styles.preview}
          numberOfLines={1}
        >{`${chat.muted ? '🔕 ' : ''}${chat.preview}`}</Text>
      </View>
      {chat.unread > 0 ? (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>{chat.unread}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

function Conversation({ chat }: { chat: Chat }) {
  const [messages, setMessages] = useState(() => makeMessages(chat.id))
  const [draft, setDraft] = useState('')
  const [composerHeight, setComposerHeight] = useState(36)
  const [attached, setAttached] = useState('none')
  const proxy = useRef<ScrollViewProxy | null>(null)
  const last = messages[messages.length - 1].id

  const send = () => {
    if (!draft.trim()) return
    setMessages((all) => [
      ...all,
      { id: `m${all.length}`, mine: true, text: draft.trim() },
    ])
    setDraft('')
    setComposerHeight(36)
  }

  return (
    <View style={styles.flex} testID="chat-stress-conversation">
      <One.iOS.ViewSlot
        name="safeAreaBarWithVerticalEdge"
        options={{ edge: 'bottom' }}
        style={styles.flex}
      >
        <One.iOS.ScrollViewReader style={styles.flex}>
          {(value) => {
            proxy.current = value
            return (
              <One.iOS.ScrollView
                testID="chat-stress-messages"
                swiftStyle={{
                  defaultScrollAnchorWithOptionalUnitPoint: 'bottom',
                  scrollDismissesKeyboard: 'interactively',
                }}
              >
                <One.iOS.LazyVStack spacing={4}>
                  {messages.map((message) => (
                    <One.iOS.VStack
                      key={message.id}
                      spacing={0}
                      swiftStyle={{ id: message.id }}
                    >
                      <One.iOS.Slot height={bubbleHeight(message) + 4}>
                        <View
                          style={[styles.bubbleRow, message.mine && styles.bubbleRowMine]}
                        >
                          <View
                            style={[styles.bubble, message.mine && styles.bubbleMine]}
                          >
                            <Text
                              style={
                                message.mine ? styles.bubbleTextMine : styles.bubbleText
                              }
                            >
                              {message.text}
                            </Text>
                          </View>
                        </View>
                      </One.iOS.Slot>
                    </One.iOS.VStack>
                  ))}
                </One.iOS.LazyVStack>
              </One.iOS.ScrollView>
            )
          }}
        </One.iOS.ScrollViewReader>
        <One.iOS.ViewSlot.Content>
          <One.iOS.Slot height={composerHeight + 16}>
            <View style={styles.composer}>
              <One.iOS.Menu
                items={attachItems}
                testID="chat-stress-attach"
                accessibilityLabel="Attach"
                onAction={setAttached}
              >
                <View style={styles.attach}>
                  <Text style={styles.attachText}>+</Text>
                </View>
              </One.iOS.Menu>
              <TextInput
                testID="chat-stress-composer"
                multiline
                placeholder="Message"
                value={draft}
                onChangeText={setDraft}
                onContentSizeChange={(event) =>
                  setComposerHeight(
                    Math.min(
                      120,
                      Math.max(36, Math.ceil(event.nativeEvent.contentSize.height) + 12)
                    )
                  )
                }
                style={[styles.input, { height: composerHeight }]}
              />
              <Pressable testID="chat-stress-send" style={styles.send} onPress={send}>
                <Text style={styles.sendText}>Send</Text>
              </Pressable>
            </View>
          </One.iOS.Slot>
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
      <View style={styles.latest} pointerEvents="box-none">
        <One.iOS.Glass style={styles.latestGlass} shape="circle" interactive>
          <One.iOS.Button
            label="Latest"
            systemImage="arrow.down"
            testID="chat-stress-scroll-bottom"
            onPress={() => proxy.current?.scrollTo(last, 'bottom')}
          />
        </One.iOS.Glass>
      </View>
      <Text
        style={styles.hidden}
        testID="chat-stress-attached"
      >{`Attached: ${attached}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#17233A' },
  time: { fontSize: 13, color: '#8E8E93' },
  preview: { fontSize: 14, color: '#8E8E93' },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sheet: { flex: 1, padding: 20, gap: 12, backgroundColor: '#FFFFFF' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#17233A' },
  toField: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  sheetButton: {
    alignSelf: 'flex-start',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  sheetButtonText: { color: '#17233A', fontWeight: '600' },
  bubbleRow: { flex: 1, flexDirection: 'row', paddingHorizontal: 12 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  bubbleMine: { backgroundColor: '#007AFF' },
  bubbleText: { fontSize: 16, lineHeight: 20, color: '#000000' },
  bubbleTextMine: { fontSize: 16, lineHeight: 20, color: '#FFFFFF' },
  composer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attach: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3E3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachText: { fontSize: 22, color: '#17233A' },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    fontSize: 16,
  },
  send: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#FFFFFF', fontWeight: '600' },
  latest: { position: 'absolute', right: 16, bottom: 90 },
  latestGlass: { width: 48, height: 48 },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
})
