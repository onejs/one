import { HeadModule } from './HeadModule'
import type { HeadType } from './types'

// @ts-ignore
export const Head: HeadType = ({ children }: { children?: any }) => {
  return children
}

Object.assign(Head, HeadModule)
