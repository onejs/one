import { useState, type ReactNode } from 'react'
import { Input, Label, YStack } from 'tamagui'
import { Dialog } from './Dialog'
import type { DialogConfirmProps, PendingConfirm } from './confirmQueue'

// shared form chrome also lets an application insert its own prompt fields.
export function DialogConfirmContent({
  title = 'Are you sure?',
  description,
  destructive,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  extraConfirm,
  children,
  onConfirm,
  onCancel,
}: DialogConfirmProps & {
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const disabled = !!extraConfirm && text !== 'Confirm'
  return (
    <>
      <Dialog.Title>{title}</Dialog.Title>
      {description ? <Dialog.Description>{description}</Dialog.Description> : null}
      {children}
      {extraConfirm ? (
        <YStack gap={7}>
          <Label htmlFor="dialog-extra-confirm">Type "Confirm" to proceed</Label>
          <Input
            id="dialog-extra-confirm"
            value={text}
            onChangeText={setText}
            placeholder="Confirm"
            onSubmitEditing={() => {
              if (!disabled) onConfirm()
            }}
          />
        </YStack>
      ) : null}
      <Dialog.Footer>
        <Dialog.Action onPress={onCancel}>{cancelLabel}</Dialog.Action>
        <Dialog.Action
          tone={destructive || extraConfirm ? 'destroy' : 'confirm'}
          disabled={disabled}
          onPress={() => {
            if (!disabled) onConfirm()
          }}
        >
          {confirmLabel}
        </Dialog.Action>
      </Dialog.Footer>
    </>
  )
}

// the Tamagui confirm dialog for the confirm on screen. every platform but
// ios draws every confirm with it; ios draws only the typed extraConfirm with
// it, since the system alert takes no text field.
export function DialogConfirmDialog({
  state,
  finish,
}: {
  state: PendingConfirm | null
  finish: (confirmed: boolean) => void
}) {
  return (
    <Dialog
      open={!!state}
      elevated
      size="compact"
      onOpenChange={(open) => {
        if (!open) finish(false)
      }}
    >
      <DialogConfirmContent
        key={state?.id}
        {...state?.props}
        onConfirm={() => finish(true)}
        onCancel={() => finish(false)}
      />
    </Dialog>
  )
}
