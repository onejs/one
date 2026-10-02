import { ColorTokens, Paragraph, Text, Tooltip } from 'tamagui'
import type { KeyboardEvent } from 'react'

export const Hint = ({
  children,
  hintContents,
  tint = 'blue',
}: {
  children: React.ReactNode
  hintContents: React.ReactNode
  tint?: 'green' | 'pink' | 'blue' | 'red' | 'purple'
}) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // Trigger the tooltip (this depends on how Tamagui's Tooltip handles this)
      // You might need to use a ref or other method to programmatically show the tooltip
    }
  }

  const color = `${tint}Fg` as ColorTokens
  const bg = tint as ColorTokens

  return (
    <Tooltip placement="top" allowFlip disableRTL offset={15} restMs={40} delay={240}>
      <Tooltip.Trigger
        render="span"
        display="inline"
        cursor="default"
        data-tint-link={tint}
        color={`hover:${color}`}
        bg={`hover:${bg}`}
        br="4"
        px={2}
        py={1}
        m={-2}
        aria-describedby="tooltip-content"
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <Text color="inherit">{children}</Text>
      </Tooltip.Trigger>
      <Tooltip.Content
        zIndex={1_000_000_000}
        opacity="enter:0 exit:0"
        x="0 enter:0 exit:0"
        scale="1 enter:0.96 exit:0.96"
        y="0 enter:-4px exit:-4px"
        transformOrigin="center bottom"
        shadowColor="shadowColor"
        shadowRadius={34}
        shadowOffset={{ width: 0, height: 17 }}
        p="5"
        bg={bg}
        transition={{
          preset: 'quicker',
          opacity: { preset: 'quicker', spring: { overshootClamping: true } },
          properties: 'transform, opacity',
        }}
        br="8"
        maw={250}
        style={{
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
        id="tooltip-content"
        role="tooltip"
        aria-hidden={false}
      >
        <Tooltip.Arrow
          style={{
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
          bg={bg}
          size={44}
        />
        <Paragraph color={color} size="6">
          {hintContents}
        </Paragraph>
      </Tooltip.Content>
    </Tooltip>
  )
}
