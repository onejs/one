import { Text, XStack } from 'tamagui'
import { useClipboard } from './useClipboard'

const AGENT_SETUP_PROMPT = `Set up this project to build with One (https://onestack.dev).

1. If there is no app yet, run \`npx one\` and pick a starter.
2. From the app root, install the official One skills for yourself: \`npx skills add onejs/skills --skill '*' --agent <your agent, such as claude-code, codex or cursor> --yes\`. Confirm with \`npx skills list\`.
3. Read the building-with-one skill before changing the app. Use one-loaders, one-api-routes, one-render-modes, one-deployment or one-guides when the task touches them, reading only the references it needs.
4. The skills follow current One. Check APIs against the \`one\` version in package.json, and tell me if the app needs an upgrade for something it uses.

Tell me what you installed and whether this is a new or existing app before you change anything else.`

export const CopyAgentPrompt = () => {
  const { hasCopied, onCopy } = useClipboard(AGENT_SETUP_PROMPT)

  return (
    <XStack
      render="button"
      alignSelf="flex-start"
      alignItems="center"
      gap="2"
      paddingHorizontal="3"
      paddingVertical="1-5"
      marginTop="3"
      marginBottom="4"
      borderWidth={1}
      borderColor="color5 hover:color7"
      borderRadius="4"
      backgroundColor="transparent hover:color2"
      cursor="pointer"
      onPress={onCopy}
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: 'var(--color11)' }}
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <Text fontSize="3" color="color11">
        {hasCopied ? 'Copied' : 'Copy agent install prompt'}
      </Text>
    </XStack>
  )
}
