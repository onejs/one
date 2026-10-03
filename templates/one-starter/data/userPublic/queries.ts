import { serverWhere, zql } from 'on-zero'

// this table contains the profile fields intentionally exposed with public
// posts. private account data belongs in a separate actor-scoped table.
const publicProfilePermission = serverWhere('userPublic', () => true)

export const userById = (props: { userId: string }) => {
  return zql.userPublic.where(publicProfilePermission).where('id', props.userId).one()
}

export const userByUsername = (props: { username: string }) => {
  return zql.userPublic.where(publicProfilePermission).where('username', props.username).one()
}
