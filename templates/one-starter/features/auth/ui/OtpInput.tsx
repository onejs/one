import { memo, useEffect, useRef, useState } from 'react'
import {
  Input as TamaguiInput,
  useWindowDimensions,
  View,
  XStack,
  YStack,
  type InputProps,
} from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'

type InputHandle = {
  focus?: () => void
  blur?: () => void
}

export interface OtpInputProps {
  otpCount?: number
  onCodeFilled?: (code: string) => void
  onCodeChanged?: (code: string) => void
  isError?: boolean
  defaultValue?: string
  autoFocus?: boolean
  'data-testid'?: string
  inputProps?: InputProps
}

export const OtpInput = memo(function OtpInput({
  otpCount = 6,
  onCodeFilled,
  onCodeChanged,
  isError = false,
  defaultValue = '',
  autoFocus = false,
  'data-testid': testId,
  inputProps,
}: OtpInputProps) {
  const { width: windowWidth } = useWindowDimensions()
  const width = Math.min(340, windowWidth)
  const inputRef = useRef<Array<InputHandle>>([])
  const [focus, setFocus] = useState(defaultValue?.length === otpCount ? -1 : 0)
  const [otpValue, setOtpValue] = useState<string[]>(() => {
    if (!defaultValue) return Array(otpCount).fill('')
    const values = defaultValue.split('').slice(0, otpCount)
    return [...values, ...Array(otpCount - values.length).fill('')]
  })
  const inputWidth = (width - 58) / otpCount

  const handlePasteValue = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, otpCount)
    const next = Array(otpCount).fill('')
    for (let i = 0; i < digits.length; i++) {
      next[i] = digits[i] ?? ''
    }
    setOtpValue(next)
    if (digits.length >= otpCount) {
      setFocus(-1)
      inputRef.current[otpCount - 1]?.blur?.()
      return
    }
    const nextIndex = Math.min(digits.length, otpCount - 1)
    setFocus(nextIndex)
    inputRef.current[nextIndex]?.focus?.()
  }

  const onFocusNext = (value: string, index: number) => {
    if (value.length > 1) {
      handlePasteValue(value)
      return
    }
    const next = [...otpValue]
    next[index] = value
    setOtpValue(next)
    if (index < otpCount - 1 && value) {
      inputRef.current[index + 1]?.focus?.()
      setFocus(index + 1)
    } else if (index === otpCount - 1) {
      setFocus(-1)
      inputRef.current[index]?.blur?.()
    }
  }

  const onFocusPrevious = (key: string, index: number) => {
    if (key !== 'Backspace') return
    const next = [...otpValue]
    if (index !== 0) {
      inputRef.current[index - 1]?.focus?.()
      setFocus(index - 1)
      next[index - 1] = ''
    } else {
      next[0] = ''
    }
    setOtpValue(next)
  }

  const handlePaste = async () => {
    // `?.readText?.().catch(...)` chains .catch on undefined when the
    // browser has no clipboard API (older iOS Safari, non-secure
    // contexts), which throws TypeError at runtime. guard via try/catch.
    let text = ''
    try {
      text = (await globalThis.navigator?.clipboard?.readText?.()) ?? ''
    } catch {}
    if (text) handlePasteValue(text)
  }

  const codeString = otpValue.join('')
  const isFilled = codeString.length === otpCount

  useEffect(() => {
    onCodeChanged?.(codeString)
    if (isFilled) onCodeFilled?.(codeString)
  }, [codeString, isFilled, onCodeChanged, onCodeFilled])

  return (
    <YStack gap={13}>
      <XStack gap={8}>
        {Array(otpCount)
          .fill(null)
          .map((_, index) => {
            const isFocused = focus === index
            return (
              <View key={index} position="relative">
                <TamaguiInput
                  testID={testId ? `${testId}-${index}` : undefined}
                  width={inputWidth}
                  height={inputWidth}
                  rounded={12}
                  fontSize="5"
                  bg={`${isError ? 'red-100' : isFocused ? 'color-3' : 'color-2'}`}
                  borderColor={`${isError ? 'red-700' : isFocused ? 'color-8' : 'color-4'}`}
                  borderWidth={1}
                  {...inputProps}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  ref={(ref) => {
                    if (ref) inputRef.current[index] = ref as InputHandle
                  }}
                  value={otpValue[index]}
                  aria-label={`Verification code digit ${index + 1} of ${otpCount}`}
                  onChangeText={(value) => onFocusNext(value, index)}
                  onKeyDown={(event) => onFocusPrevious(event.nativeEvent.key, index)}
                  autoComplete="one-time-code"
                  autoFocus={autoFocus && index === 0}
                />
              </View>
            )
          })}
      </XStack>

      <Button
        variant="quiet"
        size="sm"
        onPress={handlePaste}
        self="center"
        icon={<Icons.Paste size={14} />}
        opacity={isFilled ? 0 : 1}
        disabled={isFilled}
      >
        Paste code
      </Button>
    </YStack>
  )
})
