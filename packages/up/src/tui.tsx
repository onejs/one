import { useEffect, useState, useSyncExternalStore } from 'react'
import { getContainers, getDockerComposeContainers, parseDockerComposeYAML } from './docker'
import { useAsync } from './utils'
import type { TermPty } from 'terminosaurus'
import { proxy, useSnapshot } from 'valtio'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'term:div': any
      'term:text': any
      'term:form': any
      'term:input': any
      'term:pty': any
    }
  }
}

const globalState = proxy({
  selected: 0,
})

const useGlobalState = () => useSnapshot(globalState)

export async function debug() {
  console.info(await getDockerComposeContainers())
  // return true
}

export function OneUpTUI() {
  const [pty, setPty] = useState<TermPty | null>(null)
  const containers = useAsync(getDockerComposeContainers)
  const state = useGlobalState()
  const activeContainer = containers.data?.[state.selected]
  const [input, setInput] = useState('')

  useEffect(() => {
    containers.execute()
  }, [])

  useEffect(() => {
    if (activeContainer) {
      pty!.spawn(`docker`, [
        'exec',
        '-it',
        activeContainer.instance?.Id || '',
        '/bin/sh',
        '-c',
        '[ -e /bin/bash ] && /bin/bash || /bin/sh',
      ])
    }
  }, [activeContainer])

  const handleSubmit = async () => {}

  return (
    <term:div
      flexDirection="column"
      width="100%"
      height="100%"
      onClick={(e) => e.target.rootNode.queueDirtyRect()}
    >
      <term:div flex={1} flexDirection="row" width="100%" position="relative">
        <term:div width={30} flexDirection="column">
          {/* Discussions list */}
          <term:div flex={1} border="modern" overflow="scroll" flexDirection="column">
            {containers.data?.map((container, index) => {
              const isActive = container === activeContainer
              return (
                <term:div
                  key={container.name}
                  paddingLeft={1}
                  paddingRight={1}
                  onClick={() => {
                    globalState.selected = index
                  }}
                  backgroundColor={isActive ? 'blue' : undefined}
                >
                  <term:text>{container.name}</term:text>
                  <term:text color="yellow">{container.instance?.Status || ''}</term:text>
                </term:div>
              )
            })}
          </term:div>

          {/* <term:div flex={1} border="modern" flexDirection="column"> */}
          {/* {discussions.map((discussion) => (
              <term:div
                key={discussion.id}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={discussion.id === currentDiscussionId ? 'blue' : undefined}
                onClick={() => dispatch(setCurrentDiscussion(discussion.id))}
              >
                <term:text fontStyle={discussion.title ? undefined : `italic`}>
                  {discussion.title ?? `Untitled`}
                </term:text>
              </term:div>
            ))} */}
          {/* </term:div> */}
        </term:div>

        <term:div flex={1} flexDirection="column">
          <term:div
            flex={1}
            border="modern"
            overflow="scroll"
            alwaysScrollToBottom={true}
            paddingLeft={1}
            paddingRight={1}
          >
            <term:pty ref={setPty} flexGrow={1} />
          </term:div>

          <term:form border="modern" paddingLeft={1} paddingRight={1} onSubmit={handleSubmit}>
            <term:input decorated={true} text={input} onChange={(e) => setInput(e.target.text)} />
          </term:form>
        </term:div>
      </term:div>

      {/* {showKeyModal && (
        <KeyModal onClose={() => dispatch(anthropicSlice.actions.closeKeyModal())} />
      )} */}
    </term:div>
  )
}

function ProgressDots() {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((dots) => (dots === 2 ? 0 : dots + 1))
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return `.`.repeat(dots + 1)
}

function KeyModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('')
  const [rememberKey, setRememberKey] = useState(false)
  // const dispatch = useAppDispatch()

  const handleSubmit = () => {
    // if (rememberKey && typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, key)
    // dispatch(anthropicSlice.actions.setApiKey(key))
    // onClose()
  }

  return (
    <term:div
      position="absolute"
      inset={10}
      backgroundColor="black"
      border="modern"
      flexDirection="column"
      padding={1}
    >
      <term:text color="yellow" fontWeight="bold" marginBottom={1}>
        Enter your Anthropic API Key
      </term:text>
      <term:text marginBottom={1}>Your key will only be used locally to make API calls.</term:text>
      <term:text marginBottom={1}>It will never be transmitted to any other server.</term:text>

      <term:form onSubmit={handleSubmit} marginBottom={1}>
        <term:input
          decorated={true}
          text={key}
          secret={true}
          onChange={(e) => setKey(e.target.text)}
        />
      </term:form>

      <term:div flexDirection="row" alignItems="center" marginBottom={1}>
        <term:div
          backgroundColor={rememberKey ? 'blue' : undefined}
          onClick={() => setRememberKey(!rememberKey)}
          paddingRight={1}
        >
          <term:text>[{rememberKey ? 'X' : ' '}] Remember this key into localStorage</term:text>
        </term:div>
      </term:div>

      <term:div flexDirection="row" marginLeft="auto">
        <term:div backgroundColor="blue" onClick={handleSubmit}>
          <term:text paddingLeft={1} paddingRight={1}>
            Save
          </term:text>
        </term:div>
        <term:div marginLeft={1} backgroundColor="red" onClick={onClose}>
          <term:text paddingLeft={1} paddingRight={1}>
            Cancel
          </term:text>
        </term:div>
      </term:div>
    </term:div>
  )
}

// Note: should move that to term-strings
const hyperlink = (text: string, url: string) => {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`
}
