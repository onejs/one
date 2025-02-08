import { render } from 'terminosaurus/react'
import { debug, OneUpTUI } from './tui'

export async function up() {
  if (await debug()) {
    return
  }

  render({}, <OneUpTUI />)
}
