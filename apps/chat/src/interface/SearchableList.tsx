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
  Input,
  InputFrame,
  type InputProps,
  isWeb,
  useComposedRefs,
  useGet,
  usePropsAndStyle,
} from 'tamagui'

type ContextType = {
  items: any[] | readonly any[]
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

export type SearchableListProps<A = any> = {
  items: readonly A[] | A[]
  onSelectItem: (item: A) => void
  children: any
}

export function SearchableList<A>({ items, children, onSelectItem }: SearchableListProps<A>) {
  if (!isWeb) {
    // TODO
    return children
  }

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
      items,
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
  if (!isWeb) {
    // TODO
    return <Input {...props} />
  }

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
  const [active, setActive] = useState(false)

  emitter.use((cur) => {
    setActive(index === cur)
  })

  if (!isWeb) {
    // TODO
    return children(active, {})
  }

  const context = useContext(Context)

  return children(active, context?.getItemProps(index))
}
