import { Popover, type PopoverContentProps } from 'tamagui'

export const PopoverContent = ({
  children,
  arrow = true,
  ...props
}: PopoverContentProps & { arrow?: boolean }) => {
  return (
    <Popover.Content
      backgroundColor="$color2"
      borderWidth={1}
      ai="flex-start"
      borderColor="$borderColor"
      enterStyle={{ y: -10, opacity: 0 }}
      exitStyle={{ y: -10, opacity: 0 }}
      elevation="$5"
      animation={[
        'quick',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
      padding={0}
      {...props}
    >
      {arrow && (
        <Popover.Arrow
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$color2"
          size="$4"
        />
      )}

      {children}
    </Popover.Content>
  )
}
