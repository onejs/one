import { eq, sql } from "drizzle-orm";
import { useLoader, useNavigation, useParams } from "one";
import { useEffect } from "react";
import { YStack } from "tamagui";
import { db } from "~/code/db/connection";
import { FeedCard } from "~/code/feed/FeedCard";
import { PageContainer } from "~/code/ui/PageContainer";
import { feed, replies } from "~/code/data";

export function PostPage() {
  const postData =
    feed.find((item) => item.id.toString() === (useParams() as any).id || "") || feed[0];
  const data = {
    ...postData,
    replies: replies.filter((r) => r.postId === postData.id),
  };

  const navigation = useNavigation();
  const params = useParams<any>();

  useEffect(() => {
    navigation.setOptions({ title: data?.content || `Post #${params.id}` });
  }, [navigation, data?.content, params.id]);

  if (!data) {
    return null;
  }

  return (
    <>
      <PageContainer>
        <FeedCard {...data} disableLink />
        {data.replies && data.replies.length > 0 && (
          <YStack
            marginLeft="$7"
            borderLeftWidth={1}
            borderRightWidth={1}
            borderColor="$borderColor"
          >
            {data.replies.map((reply) => (
              <FeedCard key={reply.id} {...(reply as any)} disableLink isReply />
            ))}
          </YStack>
        )}
      </PageContainer>
    </>
  );
}
