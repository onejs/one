import { Paragraph, ScrollView, Switch, ToggleGroup, XStack, YStack } from 'tamagui'
import { Button } from '../buttons/Button'
import { CaretRightIcon } from '../icons/phosphor/CaretRightIcon'
import { Input } from './Input'
import { FieldLabel, LabeledField } from './LabeledField'
import { TextArea } from './TextArea'
import type {
  FieldProps,
  FormProps,
  SectionProps,
  NavigationRowProps,
  SegmentedFieldProps,
  SubmitButtonProps,
  ToggleFieldProps,
  ValueFieldProps,
} from './formContract'

// the web leg. this is the treatment the apps already hand-rolled: a centred
// column of cards, each card a stack of labelled inputs. it is lifted from
// examples/app-finance's edit-profile rather than redesigned, so migrating an
// app onto this pattern is a refactor on web and a real change only on native.

// the form owns its own scrolling, on both legs. SwiftUI's Form scrolls itself
// and One's screen Form fills its box, so a screen that wrapped the form in
// its own ScrollView would give the native Form an unbounded height and
// collapse it. keeping the scroll container inside the pattern means a screen
// is written the same way for both legs: a flex column, with the form
// filling it.
export function Form({ children, presentation = 'screen', testID }: FormProps) {
  // a sheet form is a block in a column its sheet already scrolls, so it adds
  // no scroll container and no centred width of its own. nesting a second
  // scroll view inside the sheet's is the web half of the same collapse the
  // native leg avoids by measuring its content.
  if (presentation === 'sheet') {
    return (
      <YStack width="100%" gap={18} testID={testID}>
        {children}
      </YStack>
    )
  }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 18 }}>
      <YStack width="100%" maxW={560} mx="auto" gap={18} testID={testID}>
        {children}
      </YStack>
    </ScrollView>
  )
}

export function Section({ title, footer, plain, children }: SectionProps) {
  return (
    <YStack gap={7}>
      {title ? <FieldLabel color="color-10">{title}</FieldLabel> : null}
      {plain ? (
        <YStack gap={13}>{children}</YStack>
      ) : (
        <YStack gap={13} p={18} rounded="6" bg="color-2">
          {children}
        </YStack>
      )}
      {footer ? <Paragraph color="color-10">{footer}</Paragraph> : null}
    </YStack>
  )
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  multiline,
  autoCapitalize,
  keyboardType,
  testID,
}: FieldProps) {
  const Control = multiline ? TextArea : Input
  return (
    <LabeledField label={label}>
      <Control
        aria-label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        testID={testID}
      />
    </LabeledField>
  )
}

export function ValueField({ label, value, testID }: ValueFieldProps) {
  // same row shape as ToggleField below, which is what keeps a section of mixed
  // rows aligned: label leading, the trailing slot secondary.
  return (
    <XStack gap={13} items="center" justify="space-between" testID={testID}>
      <FieldLabel>{label}</FieldLabel>
      <Paragraph color="color-10">{value}</Paragraph>
    </XStack>
  )
}

export function NavigationRow({
  label,
  subtitle,
  icon: Icon,
  onPress,
  testID,
}: NavigationRowProps) {
  // the row treatment app-travel's mobile settings screen already ships, lifted
  // rather than redesigned: a 56pt row, the icon and label leading, the caret
  // trailing. the caret is here and absent on native for the same reason - on
  // web there is no platform control being imitated, so the affordance is ours
  // to draw, while on native SwiftUI owns it and only gives it to a real link.
  //
  // 56 is a floor rather than a height so a subtitle can make the row two lines
  // tall instead of squeezing both into one: a single-line row still measures
  // 56, and a two-line one grows past it.
  return (
    <XStack
      minH={56}
      py={9}
      items="center"
      justify="space-between"
      gap={13}
      cursor="pointer"
      onPress={onPress}
      testID={testID}
    >
      <XStack items="center" gap={13} flex={1}>
        {Icon ? <Icon size={20} color="color-11" /> : null}
        <YStack gap={2} flex={1}>
          <Paragraph>{label}</Paragraph>
          {subtitle ? <Paragraph color="color-10">{subtitle}</Paragraph> : null}
        </YStack>
      </XStack>
      <CaretRightIcon size={14} color="color-8" />
    </XStack>
  )
}

export function SegmentedField<T extends string>({
  value,
  options,
  onChange,
  testID,
}: SegmentedFieldProps<T>) {
  // tamagui's ToggleGroup in single mode, which is the same control: a row of
  // mutually exclusive options bound to one value. `disableDeactivation` is
  // what keeps it a picker rather than a set of toggles - tapping the selected
  // segment again leaves it selected, the way a segmented control behaves,
  // instead of clearing the value to nothing.
  //
  // ToggleGroup is headless for layout: its frame is `styled(View, {})` with no
  // styles at all, and `orientation` reaches only the roving-focus group that
  // owns arrow-key movement, never flexDirection. so the track and the segments
  // are drawn here. the treatment is app-finance's shipped hand-rolled day
  // picker lifted rather than redesigned - a bordered track so the control reads
  // on any background, and a filled raised segment for the selection, which is
  // the same figure/ground the native leg gets from SwiftUI.
  //
  // `activeTheme={null}` keeps the selection in the surrounding theme. the
  // skin's default swaps the active item onto brand, and on native the item's
  // own bg resolves in the parent theme while its label resolves in brand,
  // which put brand's near-white text on the parent's pale color-4.
  return (
    <ToggleGroup
      type="single"
      orientation="horizontal"
      disableDeactivation
      value={value}
      onValueChange={onChange}
      testID={testID}
      flexDirection="row"
      gap={2}
      p={2}
      rounded="10"
      bg="color-2"
      borderWidth={1}
      borderColor="color-4"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            flex={1}
            flexBasis={0}
            minH={32}
            // the material 48dp touch target without changing the 32pt look:
            // hitSlop is invisible and ignored on web, and ios renders the
            // SwiftUI leg instead of this file.
            hitSlop={{ top: 8, bottom: 8 }}
            py={6}
            px={9}
            rounded="8"
            cursor="pointer"
            scale="press:0.96"
            transition="quick"
            activeTheme={null}
            bg={selected ? 'color-4' : 'transparent'}
          >
            <Paragraph
              fontWeight={selected ? '700' : '500'}
              color={selected ? 'color' : 'color-10'}
            >
              {option.label}
            </Paragraph>
          </ToggleGroup.Item>
        )
      })}
    </ToggleGroup>
  )
}

export function ToggleField({ label, value, onValueChange, testID }: ToggleFieldProps) {
  // the label sits beside the control, which is the row shape every settings
  // screen in the examples already uses. the native leg swaps this for
  // SwiftUI's Toggle, which owns the whole row including its own label.
  return (
    <XStack gap={13} items="center" justify="space-between">
      <FieldLabel>{label}</FieldLabel>
      {/* the frame renders a <button> and tamagui resets only its border style,
          so without borderWidth the browser's outset border squeezes the thumb */}
      <Switch
        aria-label={label}
        bg="color-5"
        borderWidth={0}
        checked={value}
        onCheckedChange={onValueChange}
        activeStyle={{ backgroundColor: 'green-800' }}
        testID={testID}
      >
        <Switch.Thumb bg="white" boxShadow="0 1px 3px shadow-5" />
      </Switch>
    </XStack>
  )
}

export function SubmitButton({
  label,
  onPress,
  disabled,
  destructive,
  testID,
}: SubmitButtonProps) {
  // the kit's app button: the primary action is its accent fill, a
  // destructive one the red theme's control
  return (
    <Button
      accent={!destructive}
      theme={destructive ? 'red' : undefined}
      size="lg"
      w="100%"
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    >
      {label}
    </Button>
  )
}
