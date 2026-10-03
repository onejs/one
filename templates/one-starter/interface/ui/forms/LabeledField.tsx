import { Paragraph, styled, YStack } from 'tamagui'
import type { ReactNode } from 'react'

// the label every web form row leads with
export const FieldLabel = styled(Paragraph, { fontWeight: '700' })

// a label over its control: the column the web Field, DateField, and Select
// share, so a choice or a date beside inputs reads as one of them.
export function LabeledField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <YStack gap={7}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </YStack>
  )
}
