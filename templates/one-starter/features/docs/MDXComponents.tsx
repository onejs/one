import { H1, H2, H3, H4, H5, Paragraph, SizableText, Spacer, XStack, YStack } from 'tamagui'
import { Link } from '~/interface/app/Link'
import { DocsCodeBlock } from './DocsCodeBlock'
import { InlineCode } from './InlineCode'
import type { Href } from 'one'
import type { ComponentType, ReactNode } from 'react'

// minimal mdx component mapping. semantic + reuses tamagui tokens; covers
// every element the social docs need today.

const scrollMargin = { scrollMarginTop: 100 } as const

function withProps<T extends ComponentType<any>>(Comp: T, extra: Record<string, any>) {
  return (props: any) => <Comp {...extra} {...props} />
}

export const components: Record<string, ComponentType<any>> = {
  h1: withProps(H1, { size: '9', mb: '4', mt: '2', style: scrollMargin }),
  h2: withProps(H2, { size: '8', mb: '3', mt: '6', style: scrollMargin }),
  h3: withProps(H3, { size: '6', mb: '2', mt: '5', style: scrollMargin }),
  h4: withProps(H4, { size: '5', mb: '2', mt: '4', style: scrollMargin }),
  h5: withProps(H5, { size: '4', mb: '2', mt: '4', style: scrollMargin }),
  p: (props: { children?: ReactNode }) => <Paragraph size="5" my={13} {...props} />,
  strong: (props: { children?: ReactNode }) => <SizableText fontWeight="800" {...props} />,
  em: (props: { children?: ReactNode }) => <SizableText fontStyle="italic" {...props} />,
  a: ({ href = '', children, ...rest }: { href?: string; children?: ReactNode }) => {
    const external = href.startsWith('http')
    return (
      <Link href={href as Href} target={external ? '_blank' : undefined}>
        <SizableText color="blue-900" textDecorationLine="hover:underline" {...rest}>
          {children}
        </SizableText>
      </Link>
    )
  },
  ul: (props: { children?: ReactNode }) => (
    <YStack render="ul" my={13} pl="6" gap="0-5" {...props} />
  ),
  ol: (props: { children?: ReactNode }) => (
    <YStack render="ol" my={13} pl="6" gap="0-5" {...props} />
  ),
  li: (props: { children?: ReactNode }) => <Paragraph render="li" size="5" {...props} />,
  blockquote: (props: { children?: ReactNode }) => (
    <YStack
      render="blockquote"
      my={18}
      px={18}
      ml={7}
      borderLeftWidth={3}
      borderLeftColor="color-7"
      bg="color-2"
      py={7}
      {...props}
    />
  ),
  hr: () => <Spacer my="6" />,
  code: ({ className, children, ...rest }: { className?: string; children?: ReactNode }) => {
    if (typeof children === 'string' && !children.includes('\n') && !className) {
      return <InlineCode {...rest}>{children}</InlineCode>
    }
    return (
      <SizableText fontFamily="mono" {...rest}>
        {children}
      </SizableText>
    )
  },
  pre: ({ children }: { children?: any }) => {
    const className: string | undefined = children?.props?.className
    const content: string =
      typeof children?.props?.children === 'string'
        ? children.props.children
        : Array.isArray(children?.props?.children)
          ? children.props.children.join('')
          : ''
    return <DocsCodeBlock className={className}>{content}</DocsCodeBlock>
  },
  table: (props: { children?: ReactNode }) => <YStack render="table" my={18} {...props} />,
  thead: (props: { children?: ReactNode }) => <YStack render="thead" {...props} />,
  tbody: (props: { children?: ReactNode }) => <YStack render="tbody" {...props} />,
  tr: (props: { children?: ReactNode }) => <XStack render="tr" gap={13} {...props} />,
  th: (props: { children?: ReactNode }) => <Paragraph render="th" fontWeight="700" {...props} />,
  td: (props: { children?: ReactNode }) => <Paragraph render="td" {...props} />,
}
