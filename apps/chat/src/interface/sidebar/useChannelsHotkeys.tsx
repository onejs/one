import { useHotkeys } from 'react-hotkeys-hook'
import { useServerChannels } from '~/state/useQuery'
import { updateUserState, useUserState } from '~/state/user'

export const useChannelsHotkeys = () => {
  const channels = useServerChannels()
  const [{ activeServer, activeChannels }, { activeChannel }] = useUserState()

  useHotkeys('meta+]', () => {
    if (!activeServer) return

    const index = channels.findIndex((x) => x.id === activeChannel)
    const next = index + 1

    if (channels.length > next) {
      updateUserState({
        activeChannels: {
          ...activeChannels,
          [activeServer]: channels[index + 1].id,
        },
      })
    }
  })

  useHotkeys('meta+[', () => {
    if (!activeServer) return

    const index = channels.findIndex((x) => x.id === activeChannel)

    if (index > 0) {
      updateUserState({
        activeChannels: {
          ...activeChannels,
          [activeServer]: channels[index - 1].id,
        },
      })
    }
  })
}
