import { Link2 } from '~/features/icons/lucide'
import type { ComponentProps } from 'react'
import { View, html } from 'tamagui'

export const LinkHeading = ({
  id,
  children,
  ...props
}: { id: string } & ComponentProps<typeof html.a>) => (
  <html.a
    flexDirection="row"
    display="inline-flex"
    gap="4"
    {...props}
    className="text-underline-none"
    style={{ textDecoration: 'none' }}
    href={`#${id}`}
    id={id}
    data-id={id}
    alignItems="center"
  >
    {children}
    <View render="span" opacity={0.3}>
      <Link2 size={16} color="var(--color)" aria-hidden />
    </View>
  </html.a>
)
