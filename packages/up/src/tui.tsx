import { useEffect, useState } from 'react'
import { getContainers, getDockerComposeContainers, parseDockerComposeYAML } from './docker'
import { useAsync } from './utils'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'term:div': any
      'term:text': any
      'term:form': any
      'term:input': any
    }
  }
}

export async function debug() {
  console.info(await getDockerComposeContainers())
  // return true
}

export function OneUpTUI() {
  const containers = useAsync(getDockerComposeContainers)
  const [input, setInput] = useState('')

  useEffect(() => {
    containers.execute()
  }, [])

  const handleSubmit = async () => {}

  return (
    <term:div
      flexDirection="column"
      width="100%"
      height="100%"
      onClick={(e) => e.target.rootNode.queueDirtyRect()}
    >
      {/* {!apiKey ? (
        <term:div
          height={1}
          backgroundColor="yellow"
          // onClick={() => dispatch(anthropicSlice.actions.openKeyModal())}
        >
          <term:text color="black" paddingLeft={1} paddingRight={1}>
            Click here to set your Anthropic API key and start chatting!
          </term:text>
        </term:div>
      ) : (
        <term:div height={1} backgroundColor="gray" flexDirection="row">
          <term:text flex={1} color="white" paddingLeft={1}>
            Connected as Anthropic User
          </term:text>
          <term:div
            marginLeft={1}
            marginRight={1}
            paddingLeft={1}
            paddingRight={1}
            backgroundColor="darkGray"
            // onClick={handleLogout}
          >
            Logout
          </term:div>
        </term:div>
      )} */}

      <term:div flex={1} flexDirection="row" width="100%" position="relative">
        <term:div width={30} flexDirection="column">
          {/* Discussions list */}
          <term:div flex={1} border="modern" overflow="scroll" flexDirection="column">
            {containers.data?.map((container) => (
              <term:div
                key={container.name}
                paddingLeft={1}
                paddingRight={1}
                // backgroundColor={currentDiscussion.model === model ? 'blue' : undefined}
                // onClick={() =>
                //   dispatch(
                //     anthropicSlice.actions.setDiscussionModel({
                //       discussionId: currentDiscussionId,
                //       model,
                //     })
                //   )
                // }
              >
                <term:text>{container.name}</term:text>
              </term:div>
            ))}
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
            {/* {currentDiscussion.messages.length === 0 && !isProcessing && (
              <term:div flexDirection="column">
                <term:text color="yellow" fontWeight="bold" marginBottom={1}>
                  Welcome to the Terminosaurus Anthropic Chat!
                </term:text>
                <term:text marginBottom={1}>
                  This is a terminal-based chat interface for{' '}
                  {hyperlink(`Anthropic`, `https://anthropic.com/`)}. To use this application:
                </term:text>
                <term:text marginBottom={1}>
                  1. Click the yellow banner to set your API key
                </term:text>
                <term:text marginBottom={1}>
                  2. Type your message in the input box below and press Enter
                </term:text>
                <term:text marginBottom={1}>3. Use /new to start a new conversation</term:text>
                <term:text color="gray">
                  Note: The Anthropic API key is only used locally to make API calls. It will never
                  be transmitted to any other server.
                </term:text>
              </term:div>
            )}

            {currentDiscussion.messages.map((message, index) => (
              <term:div key={`${index}`} marginBottom={1}>
                <term:text color={message.role === 'user' ? 'green' : 'blue'} fontWeight="bold">
                  {message.role === 'user' ? 'You' : 'Anthropic'}:
                </term:text>
                <term:text whiteSpace="preLine">{message.content}</term:text>
              </term:div>
            ))}

            {error && (
              <term:div marginBottom={1}>
                <term:text color="red" fontWeight="bold">
                  {error}
                </term:text>
              </term:div>
            )}

            {isProcessing && (
              <term:div>
                <term:text fontStyle={`italic`} color="yellow">
                  Anthropic is thinking
                  <ProgressDots />
                </term:text>
              </term:div>
            )} */}
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
