import { cloneElement, type ComponentProps } from 'react'
import PagerView from 'react-native-pager-view'

type Props = ComponentProps<typeof PagerView> & {
  onScrollCost?: (milliseconds: number) => void
}

// measure the rival's complete JS scroll callback, including keyboard dismissal.
// the shared React Native event dispatcher is outside both measurements.
export default class PagerBaseline extends PagerView {
  declare props: Readonly<Props>

  override render() {
    const native = super.render()
    const onScroll = native.props.onPageScroll
    return cloneElement(native, {
      onPageScroll: (event) => {
        const start = performance.now()
        onScroll?.(event)
        this.props.onScrollCost?.(performance.now() - start)
      },
    })
  }
}
