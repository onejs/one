import { Field, Form, Section, SubmitButton } from '~/interface/ui/forms/Form'
import { One } from 'one'
import { useEffect, useRef, useState } from 'react'
import { H4, Paragraph, Spinner, XStack, YStack, isWeb } from 'tamagui'
import { SettingsWebChrome } from '~/features/settings/SettingsWebChrome'
import { useEditProfileForm } from '~/features/user/useEditProfileForm'
import { Avatar } from '~/interface/avatars/Avatar'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import { uploadFile } from '~/interface/upload/uploadFile'

export default function EditProfilePage() {
  if (isWeb) {
    return (
      <SettingsWebChrome>
        <EditProfileContent />
      </SettingsWebChrome>
    )
  }
  return <EditProfileContent />
}

function EditProfileContent() {
  const {
    authUser,
    user,
    saveState,
    name,
    username,
    dirty,
    message,
    setMessage,
    markDirty,
    updateName,
    updateUsername,
    save,
  } = useEditProfileForm()
  const [avatarUrl, setAvatarUrl] = useState(user?.image || authUser?.image || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dirty) return
    setAvatarUrl(user?.image || authUser?.image || '')
  }, [authUser?.image, dirty, user?.image])

  const pickAvatar = async (file: Parameters<typeof uploadFile>[0]) => {
    setUploadingAvatar(true)
    setMessage(null)
    try {
      const result = await uploadFile(file)
      setAvatarUrl(result.url)
      markDirty()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload avatar.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <YStack flex={1}>
      <YStack items="center" gap={13} pt={isWeb ? 0 : 16} pb={8}>
        {/* the native stack's navigation bar already titles this screen. */}
        {isWeb ? (
          <YStack items="center">
            <H4>Edit Profile</H4>
            <Paragraph color="color-10">Keep your public profile tidy.</Paragraph>
          </YStack>
        ) : null}
        <Avatar
          size={72}
          image={avatarUrl}
          name={name || username || authUser?.email || 'User'}
          testID="edit-profile-avatar"
        />
        <XStack gap={13} items="center">
          {isWeb ? (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              data-testid="edit-profile-avatar-input"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void pickAvatar(file)
              }}
            />
          ) : null}
          <Button
            icon={uploadingAvatar ? undefined : <Icons.Upload size={16} />}
            onPress={() => {
              if (isWeb) {
                fileInputRef.current?.click()
                return
              }
              void One.ImagePicker.launchLibrary({ mediaTypes: 'images' }).then((result) => {
                const asset = result.canceled ? null : (result.assets[0] ?? null)
                if (!asset) return
                void pickAvatar({
                  uri: asset.uri,
                  name: asset.fileName ?? `avatar-${Date.now()}`,
                  type: asset.mimeType ?? 'application/octet-stream',
                  size: asset.fileSize || 0,
                  lastModified: Date.now(),
                })
              })
            }}
            disabled={uploadingAvatar || saveState.pending}
            aria-label="Change profile avatar"
            testID="edit-profile-avatar-button"
          >
            {uploadingAvatar ? <Spinner /> : 'Change avatar'}
          </Button>
        </XStack>
      </YStack>

      <Form testID="edit-profile-form">
        <Section>
          <Field
            label="Name"
            value={name}
            onChangeText={updateName}
            placeholder="Display name"
            testID="edit-profile-name"
          />
          <Field
            label="Username"
            value={username}
            onChangeText={updateUsername}
            placeholder="username"
            autoCapitalize="none"
            testID="edit-profile-username"
          />
        </Section>
        <Section footer={saveState.error?.message ?? message ?? undefined}>
          <SubmitButton
            label={saveState.pending ? 'Saving…' : 'Save profile'}
            onPress={() => save(avatarUrl)}
            disabled={saveState.pending || uploadingAvatar}
            testID="edit-profile-save"
          />
        </Section>
      </Form>
    </YStack>
  )
}
