import { useEffect, useState } from 'react'
import type { TermPty } from 'terminosaurus'
import { proxy, useSnapshot } from 'valtio'
import { getDockerComposeContainers } from './docker'
import { readPackageJSON } from './package'
import { objectEntries } from './typeHelpers'
import { useAsync } from './utils'

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
  processes: {} as Record<string, Process>,
  logs: [] as string[],
})

function log(...args: string[]) {
  globalState.logs.push(args.join(' '))
}

const useGlobalState = () => useSnapshot(globalState)

export async function debug() {
  console.info(await getDockerComposeContainers())
  // return true
}

type Process = {
  name: string
  run: string
  type: 'docker' | 'script'
  status: 'idle' | 'running'
  pty?: TermPty | null
}

const ptys = new Set<any>()

export function OneUpTUI() {
  const runnableScripts = useAsync(readRunnableScripts, 'development')
  const containers = useAsync(getDockerComposeContainers)
  const inactiveContainers = containers.data?.filter((x) => !x.instance?.Status)
  const state = useGlobalState()
  const [input, setInput] = useState('')

  useEffect(() => {
    containers.execute()
    runnableScripts.execute()
  }, [])

  const containerProcesses = containers.data?.map((container) => {
    return {
      name: container.name,
      run: `docker exec -it ${container.instance?.Id || ''} /bin/sh -c [ -e /bin/bash ] && /bin/bash || /bin/sh`,
      status: 'idle',
      type: 'docker',
    } as Process
  })

  const scriptProcesses = runnableScripts.data?.map((script) => {
    return {
      name: script.name,
      run: `bun ${script.command}`,
      status: 'idle',
      type: 'script',
    } as Process
  })

  const processes = [...(scriptProcesses || []), ...(containerProcesses || [])]
  const activeProc = processes[state.selected]

  // useEffect(() => {
  //   if (activeContainer?.instance?.Status) {
  //     pty!.spawn()
  //   }
  // }, [activeContainer])

  const handleSubmit = async () => {}

  return (
    <term:div
      flexDirection="column"
      width="100%"
      height="100%"
      onClick={(e) => e.target.rootNode.queueDirtyRect()}
    >
      {/* <term:text>{JSON.stringify(runnableScripts.data) || ''}</term:text> */}
      <term:text>{state.logs.join('\n')}</term:text>
      <term:div flex={1} flexDirection="row" width="100%" position="relative">
        <term:div width={30} flexDirection="column">
          {/* Discussions list */}
          <term:div flex={1} border="modern" overflow="scroll" flexDirection="column">
            {processes.map((proc, index) => {
              const isActive = proc === activeProc
              return (
                <term:div
                  key={proc.name}
                  paddingLeft={1}
                  paddingRight={1}
                  onClick={() => {
                    globalState.selected = index
                  }}
                  backgroundColor={isActive ? 'blue' : undefined}
                >
                  <term:text>{proc.name}</term:text>
                  <term:text color="yellow">{proc.status || 'Starting...'}</term:text>
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
            {processes.map((proc, index) => {
              return (
                <term:pty
                  key={proc.name}
                  ref={(ref) => {
                    if (ref && !ptys.has(ref)) {
                      ptys.add(ref)
                      const [command, ...args] = proc.run.split(' ')
                      ref.spawn(command, args)
                      // log(`spawn ${proc.name} ${typeof ref}`)
                    }
                  }}
                  flexGrow={1}
                  display={
                    index === state.selected
                      ? // || index === state.selected + 1
                        'flex'
                      : 'none'
                  }
                />
              )
            })}
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

const readRunnableScripts = async (mode: 'development' | 'production') => {
  const json = await readPackageJSON('.')
  return objectEntries(json.scripts || {}).flatMap(([name, command]) => {
    if (name === 'dev' || name.startsWith('dev:') || name === 'watch') {
      return [
        {
          name,
          command,
        },
      ]
    }
    return []
  })
}
