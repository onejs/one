import { isSyncState } from './syncStore'
import { validateDatePickerProps } from './composeValidation'

export function composeRangeDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function localRangeDay(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

// validate before passing configuration to Compose constructors, which reject
// invalid ranges and geometry on the UI thread.
export function validateComposeFamily(kind: string, props: Record<string, any>): void {
  const fail = (key: string) => {
    throw new Error(`Compose ${kind} invalid ${key}`)
  }
  const number = (key: string, minimum = 0, maximum = Infinity) => {
    const value = props[key]
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < minimum ||
        value > maximum)
    )
      fail(key)
  }
  const boolean = (key: string) => {
    if (props[key] !== undefined && typeof props[key] !== 'boolean') fail(key)
  }
  const callback = (key: string) => {
    if (props[key] !== undefined && typeof props[key] !== 'function') fail(key)
  }
  if (kind.endsWith('carousel')) {
    for (const key of [
      'maxItemWidth',
      'preferredItemWidth',
      'itemWidth',
      'minSmallItemWidth',
      'maxSmallItemWidth',
    ])
      number(key, Number.MIN_VALUE)
    number('itemSpacing')
    boolean('userScrollEnabled')
    if (kind === 'multibrowsecarousel' && props.preferredItemWidth === undefined)
      fail('preferredItemWidth')
    if (kind === 'uncontainedcarousel' && props.itemWidth === undefined) fail('itemWidth')
    if (
      props.minSmallItemWidth !== undefined &&
      props.maxSmallItemWidth !== undefined &&
      props.minSmallItemWidth > props.maxSmallItemWidth
    )
      fail('small item widths')
    if (
      props.flingBehavior !== undefined &&
      !['singleAdvance', 'noSnap'].includes(props.flingBehavior)
    )
      fail('flingBehavior')
    if (typeof props.contentPadding === 'number') {
      if (!Number.isFinite(props.contentPadding) || props.contentPadding < 0)
        fail('contentPadding')
    } else if (props.contentPadding !== undefined) {
      if (!props.contentPadding || typeof props.contentPadding !== 'object')
        fail('contentPadding')
      for (const value of Object.values(props.contentPadding))
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
          fail('contentPadding')
    }
  } else if (kind === 'shape') {
    for (const key of ['smoothing', 'cornerRounding', 'innerRadius', 'radius'])
      number(key, 0, 1)
    number('verticesCount', 3)
    if (props.verticesCount !== undefined && !Number.isInteger(props.verticesCount))
      fail('verticesCount')
    for (const key of ['topStart', 'topEnd', 'bottomStart', 'bottomEnd']) number(key)
  } else if (kind === 'dialog') {
    callback('onDismissRequest')
    if (props.properties !== undefined) {
      if (!props.properties || typeof props.properties !== 'object') fail('properties')
      for (const [key, value] of Object.entries(props.properties)) {
        if (
          ![
            'dismissOnBackPress',
            'dismissOnClickOutside',
            'usePlatformDefaultWidth',
            'decorFitsSystemWindows',
          ].includes(key) ||
          typeof value !== 'boolean'
        )
          fail(key)
      }
    }
  } else if (kind === 'toolbar') {
    if (props.variant !== undefined && !['standard', 'vibrant'].includes(props.variant))
      fail('variant')
  } else if (kind === 'syncswitch') {
    if (!isSyncState(props.isOn) || typeof props.isOn.value !== 'boolean')
      fail('isOn (requires NativeState<boolean>)')
    boolean('enabled')
  } else if (kind === 'range') {
    const date = (key: string): Date | undefined => {
      const value = props[key]
      if (value == null) return undefined
      if (typeof value !== 'string' || !Number.isFinite(new Date(value).getTime()))
        fail(key)
      return new Date(value)
    }
    const start = date('initialStartDate')
    const end = date('initialEndDate')
    if (end && (!start || composeRangeDay(end) < composeRangeDay(start)))
      fail('initialEndDate')
    callback('onDateRangeSelected')
    for (const key of ['showTitle', 'showHeadline', 'showVariantToggle']) boolean(key)
    // use the same bounds, display-mode and color contract as DatePicker.
    validateDatePickerProps({
      selection: localRangeDay(
        start ?? props.selectableDates?.start ?? props.selectableDates?.end ?? new Date()
      ),
      minimumDate:
        props.selectableDates?.start && localRangeDay(props.selectableDates.start),
      maximumDate: props.selectableDates?.end && localRangeDay(props.selectableDates.end),
      variant: props.variant,
      colors: props.elementColors,
      color: props.color,
    })
    if (end)
      validateDatePickerProps({
        selection: localRangeDay(end),
        minimumDate:
          props.selectableDates?.start && localRangeDay(props.selectableDates.start),
        maximumDate:
          props.selectableDates?.end && localRangeDay(props.selectableDates.end),
      })
  }
}
