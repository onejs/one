import { tokens } from '~/config/tokens'
import { Paragraph, Text, Tooltip } from 'tamagui'
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
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.key === 'Enter' || event.nativeEvent.key === ' ') {
      event.preventDefault()
    }
  }

  const color = `${tint}Fg`
  const bg = tint

  return (
    <Tooltip placement="top" allowFlip disableRTL offset={15} restMs={40} delay={240}>
      <Tooltip.Trigger
        render="span"
        display="inline"
        cursor="default"
        color={`hover:${color}`}
        backgroundColor={`hover:${bg}`}
        borderRadius="4"
        paddingHorizontal={2}
        paddingVertical={1}
        margin={-2}
        data-tint-link={tint}
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
        shadowRadius={44}
        shadowOffset={{ height: 22, width: 0 }}
        padding="5"
        backgroundColor={bg}
        transition={{
          preset: 'quicker',
          opacity: { preset: 'quicker', spring: { overshootClamping: true } },
          properties: 'transform, opacity',
        }}
        borderRadius="8"
        maxWidth={250}
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
          backgroundColor={bg}
          size={tokens.size[4].val}
        />
        <Paragraph color={color} size="6">
          {hintContents}
        </Paragraph>
      </Tooltip.Content>
    </Tooltip>
  )
}
