import { useState } from 'react'
import { Button, ScrollView, SizableText, XStack, YStack } from 'tamagui'

// minimal code block: filename header (when className is `language-bash`,
// shown as Terminal), horizontal scroll, copy button. richer
// collapse/line-numbers variant lives in the static template's DocsCodeBlock.
export function DocsCodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const language = className?.replace(/^language-/, '') ?? ''
  const label = language === 'bash' || language === 'sh' ? 'Terminal' : language

  return (
    <YStack
      my={18}
      borderWidth={0.5}
      borderColor="color-5"
      rounded="4"
      bg="color-2"
      overflow="hidden"
    >
      {label && (
        <XStack
          items="center"
          justify="space-between"
          px={18}
          py={7}
          borderBottomWidth={0.5}
          borderBottomColor="color-5"
          bg="color-1"
        >
          <SizableText size="2" color="color-10" fontFamily="mono">
            {label}
          </SizableText>
          <Button size="xs" variant="quiet" onPress={copy}>
            <SizableText size="1" color="color-10">
              {copied ? 'Copied!' : 'Copy'}
            </SizableText>
          </Button>
        </XStack>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <YStack p={18}>
          <SizableText fontFamily="mono" size="2" color="color" whiteSpace="pre">
            {children}
          </SizableText>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
