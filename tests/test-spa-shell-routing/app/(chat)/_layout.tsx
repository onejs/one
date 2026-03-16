import { Slot } from 'one'

// this group has nested dynamic routes like the chat app:
// [serverId]/[channelId] - matches any two-segment path
// this creates ambiguity with (authed)/beta/signup

export default function ChatLayout() {
  return (
    <div id="chat-layout">
      <Slot />
    </div>
  )
}
