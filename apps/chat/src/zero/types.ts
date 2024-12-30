export type AuthData = {
  id: string
}

export type UserState = {
  serversSort?: string[]
  activeServer?: string
  // serverId to channelId
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
  channelState?: ChannelsState
  // array so we can occasionally cull oldest, only need to remember a few
  messageEdits?: [{ id: string; content: string }]
}

export type ChannelsState = {
  [server_and_channel_id: string]: ChannelState
}

export type ChannelState = {
  mainView?: 'thread' | 'chat'
  focusedMessageId?: string
  editingMessageId?: string
  openedThreadId?: string
}
