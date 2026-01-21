import { Link } from 'one'

export default function PostsIndex() {
  return (
    <div>
      <h1>Posts</h1>
      <ul>
        <li>
          <Link href="/posts/hello-world" id="link-hello">
            Hello World
          </Link>
        </li>
        <li>
          <Link href="/posts/another-post" id="link-another">
            Another Post
          </Link>
        </li>
      </ul>
    </div>
  )
}
