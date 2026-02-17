import { Link, Slot } from 'one'

export default function DeepLayout() {
  return (
    <div>
      <nav id="deep-nav">
        <Link href="/not-found/deep/valid-item" id="nav-valid-item">
          Valid Item
        </Link>
        <Link href="/posts" id="nav-posts">
          Posts
        </Link>
      </nav>
      <Slot />
    </div>
  )
}
