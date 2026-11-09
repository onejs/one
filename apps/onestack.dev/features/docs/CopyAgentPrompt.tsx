import { Paragraph } from 'tamagui'
import { useClipboard } from './useClipboard'

export const AGENT_SETUP_PROMPT = `Set up this project to build with One (https://onestack.dev).

1. If there is no app yet, run \`npx one\` and pick a starter.
2. From the app root, install the official One skills for yourself: \`npx skills add onejs/skills --skill '*' --agent <your agent, such as claude-code, codex or cursor> --yes\`. Confirm with \`npx skills list\`.
3. Read the building-with-one skill before changing the app. Use one-loaders, one-api-routes, one-render-modes, one-deployment or one-guides when the task touches them, reading only the references it needs.
4. The skills follow current One. Check APIs against the \`one\` version in package.json, and tell me if the app needs an upgrade for something it uses.

Tell me what you installed and whether this is a new or existing app before you change anything else.`

export const CopyAgentPrompt = ({ size = '3' }: { size?: '2' | '3' | '4' }) => {
  const { hasCopied, onCopy } = useClipboard(AGENT_SETUP_PROMPT)

  return (
    <Paragraph
      render="span"
      role="button"
      size={size}
      color="color11 hover:color12"
      cursor="pointer"
      textDecorationLine="underline"
      display="flex"
      alignSelf="flex-start"
      onPress={onCopy}
    >
      {hasCopied ? 'Copied agent prompt' : 'Copy agent setup prompt'}
    </Paragraph>
  )
}
