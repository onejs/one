import { useMutation } from 'on-zero'
import { useEffect, useState } from 'react'
import { useUser } from '~/features/user/useUser'

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 30)
}

// shared edit-profile state: web and native render different surfaces over
// the same fields, dirty tracking, and save. the avatar stays with the screen,
// which owns its upload.
export function useEditProfileForm() {
  const { authUser, user, update } = useUser()
  const [saveProfile, saveState] = useMutation(update)
  const [name, setName] = useState(user?.name || authUser?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (dirty) return
    setName(user?.name || authUser?.name || '')
    setUsername(user?.username || '')
  }, [authUser?.name, dirty, user?.name, user?.username])

  const updateName = (value: string) => {
    setName(value)
    setDirty(true)
  }

  const updateUsername = (value: string) => {
    setUsername(value)
    setDirty(true)
  }

  const save = (avatarUrl: string) => {
    // optimistic: the profile updates locally now. saveState.error surfaces a
    // server rejection inline; no need to await the round-trip.
    saveProfile({
      name: name.trim() || null,
      username: normalizeUsername(username || name || authUser?.email || 'user'),
      image: avatarUrl || null,
    })
    setDirty(false)
    setMessage('Profile saved.')
  }

  return {
    authUser,
    user,
    saveState,
    name,
    username,
    dirty,
    message,
    setMessage,
    markDirty: () => setDirty(true),
    updateName,
    updateUsername,
    save,
  }
}
