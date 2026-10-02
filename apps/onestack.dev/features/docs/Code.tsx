import { Text, Theme, styled } from '@tamagui/core'

export const Code = styled(Text, {
  name: 'Code',
  render: 'code',
  fontFamily: 'mono',
  lineHeight: '18px',
  cursor: 'inherit',
  whiteSpace: 'pre',
  padding: '1',
  borderRadius: '4',
  variants: {
    colored: {
      true: {
        color: 'color',
        backgroundColor: 'background',
      },
    },
    allowMultiline: {
      true: {
        whiteSpace: 'normal',
      },
    },
  } as const,
})

const CodeInlineBase = styled(Text, {
  name: 'CodeInline',
  render: 'code',
  fontFamily: 'mono',
  color: 'color12',
  backgroundColor: 'background08',
  cursor: 'inherit',
  // @ts-ignore
  fontSize: '88%',
  lineHeight: '32px',
  p: '1-5',
  whiteSpace: 'pre-wrap',
  br: '3',
})

export const CodeInline = (props: any) => (
  <Theme name="yellow">
    <CodeInlineBase style={{ wordBreak: 'break-word' }} {...props} />
  </Theme>
)
