import type { PropsWithChildren } from 'react'
import { HeadModule } from './HeadModule'
import type { HeadType } from './types'

// @ts-ignore
export const Head: HeadType = (props: PropsWithChildren) => null

Object.assign(Head, HeadModule)
