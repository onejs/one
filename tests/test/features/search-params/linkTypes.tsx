import { Link } from 'one'

// the generated route types make a wrong key or value a type error at the link
export const typedLinks = (
  <>
    <Link href="/search-params" searchParams={{ page: 2, metric: 'revenue' }} />
    {/* @ts-expect-error unknown key */}
    <Link href="/search-params" searchParams={{ pagee: 2 }} />
    {/* @ts-expect-error metric is 'users' | 'revenue' */}
    <Link href="/search-params" searchParams={{ metric: 'cost' }} />
    {/* @ts-expect-error page is a number */}
    <Link href="/search-params" searchParams={{ page: 'two' }} />
    {/* a route with no component schemas takes any simple values */}
    <Link href="/" searchParams={{ anything: 'goes' }} />
  </>
)
