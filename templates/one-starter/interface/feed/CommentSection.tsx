import { formatDistanceToNow } from '~/interface/ui/display'
import { Input } from '~/interface/ui/forms/Input'
import { useMutation } from 'on-zero'
import { One } from 'one'
import { useState } from 'react'
import { Paragraph, View, XStack, YStack } from 'tamagui'
import { useSession } from '~/auth/client/authClient'
import { zero } from '~/data/zero-client'
import { randomId } from '~/helpers/randomId'
import { Avatar } from '~/interface/avatars/Avatar'
import { Button } from '~/interface/buttons/Button'
import type { CommentWithUser } from '~/types'

interface Props {
  postId: string
  comments: readonly CommentWithUser[]
}

export function CommentSection({ postId, comments }: Props) {
  const [text, setText] = useState('')
  const { data: session } = useSession()
  const [addComment] = useMutation((props: Parameters<typeof zero.mutate.comment.insert>[0]) =>
    zero.mutate.comment.insert(props),
  )

  const onSubmit = () => {
    const content = text.trim()
    if (!content || !session?.user) return
    One.Haptics.selection()
    // optimistic: the comment shows instantly, clear the input now. a server
    // rejection rolls back the optimistic row and surfaces via onMutationError.
    addComment({ id: randomId(), postId, content, createdAt: Date.now() })
    setText('')
  }

  return (
    <YStack gap={7}>
      {comments.length === 0 ? (
        <Paragraph color="color-10">No comments yet.</Paragraph>
      ) : (
        comments.map((c) => (
          <XStack key={c.id} gap={13} items="flex-start">
            <Avatar name={c.user?.username || c.user?.name || '?'} size={28} />
            <YStack flex={1} gap="0-5">
              <XStack gap={7} items="center">
                <Paragraph fontWeight="600">
                  {c.user?.username || c.user?.name || 'Unknown'}
                </Paragraph>
                <Paragraph size="2" color="color-10">
                  {formatDistanceToNow(c.createdAt)}
                </Paragraph>
              </XStack>
              <Paragraph>{c.content}</Paragraph>
            </YStack>
          </XStack>
        ))
      )}

      {session?.user ? (
        <XStack gap={7} mt={13}>
          <Input
            flex={1}
            value={text}
            onChangeText={setText}
            aria-label="Comment"
            placeholder="Add a comment…"
            testID="comment-input"
          />
          <Button
            size="sm"
            accent
            onPress={onSubmit}
            disabled={!text.trim()}
            testID="comment-submit"
          >
            Post
          </Button>
        </XStack>
      ) : null}
    </YStack>
  )
}
