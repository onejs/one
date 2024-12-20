import {
  type ReferenceType,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from '@floating-ui/react'
import { createEmitter } from '@vxrn/emitter'
import { createContext, forwardRef, useContext, useMemo, useRef, useState } from 'react'
import {
  type Input,
  InputFrame,
  type InputProps,
  useComposedRefs,
  useGet,
  usePropsAndStyle,
} from 'tamagui'

type ContextType = {
  getItemProps: (index: number) => any
  getReferenceProps: (userProps?: React.HTMLProps<Element>) => Record<string, unknown>
  refs: {
    reference: React.MutableRefObject<ReferenceType | null>
    floating: React.MutableRefObject<HTMLElement | null>
    setReference: (node: ReferenceType | null) => void
    setFloating: (node: HTMLElement | null) => void
  }
}

const Context = createContext<null | ContextType>(null)

const emitter = createEmitter<number>()

export function SearchableList<A>({
  items,
  children,
  onSelectItem,
}: { items: A[]; onSelectItem: (item: A) => void; children: any }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(0)
  const { refs, context } = useFloating({
    open: true,
  })

  const listRef = useRef<Array<HTMLElement | null>>([])

  const listNavigation = useListNavigation(context, {
    virtual: true,
    loop: true,
    listRef,
    activeIndex,
    onNavigate: (index) => {
      if (typeof index === 'number') {
        setActiveIndex(index)
        emitter.emit(index)
      }
    },
  })

  const role = useRole(context, { role: 'listbox' })
  const dismiss = useDismiss(context)
  const { getReferenceProps, getItemProps } = useInteractions([role, dismiss, listNavigation])

  const getActiveIndex = useGet(activeIndex)

  const contextValue = useMemo((): ContextType => {
    return {
      refs,
      getReferenceProps(props) {
        return getReferenceProps({
          ...props,
          onKeyDown(event) {
            const activeIndex = getActiveIndex()
            if (event.key === 'Enter' && activeIndex != null && items[activeIndex]) {
              setActiveIndex(null)
              onSelectItem?.(items[activeIndex])
            }
          },
        })
      },
      getItemProps(index: number) {
        return getItemProps({
          key: items[index] as any,
          ref(node) {
            listRef.current[index] = node
          },
        })
      },
    }
  }, [items, getReferenceProps, refs, getItemProps])

  return <Context.Provider value={contextValue}>{children}</Context.Provider>
}

export const SearchableInput = forwardRef<Input, InputProps>((props: InputProps, ref) => {
  const context = useContext(Context)
  const combinedRef = useComposedRefs(ref, context?.refs.setReference as any)
  const [inputProps, inputStyle] = usePropsAndStyle(props, {
    forComponent: InputFrame,
  })
  const refProps = context?.getReferenceProps({
    ref: combinedRef as any,
  })

  return (
    <input
      {...refProps}
      {...(inputProps as any)}
      onChange={(e) => {
        props.onChangeText?.(e.target.value)
        props.onChange?.(e as any)
      }}
      style={{
        ...(inputStyle as any),
        borderWidth: 0,
      }}
    />
  )
})

export const SearchableListItem = ({
  children,
  index,
}: {
  children: (active: boolean, itemProps: Record<string, any>) => JSX.Element
  index: number
}) => {
  const context = useContext(Context)
  const [active, setActive] = useState(false)

  emitter.use((cur) => {
    setActive(index === cur)
  })

  return children(active, context?.getItemProps(index))
}
