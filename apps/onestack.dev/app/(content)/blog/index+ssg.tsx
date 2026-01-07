import { Link, useLoader } from "one";
import { H1, H2, Paragraph, SizableText, XStack, YStack } from "tamagui";
import { TopNav } from "~/components/TopNav";
import { authors } from "~/data/authors";
import { Container } from "~/features/site/Containers";
import { HeadInfo } from "~/features/site/HeadInfo";

export async function loader() {
  const { getAllFrontmatter } = await import("@vxrn/mdx");
  const frontmatters = getAllFrontmatter("data/blog");
  const sortedFrontmatters = frontmatters
    .filter((x) => !x.draft)
    .sort((a, b) => Number(new Date(b.publishedAt || "")) - Number(new Date(a.publishedAt || "")));
  return { frontmatters: sortedFrontmatters };
}

export default function BlogIndex() {
  const { frontmatters } = useLoader(loader);

  return (
    <>
      <HeadInfo title="Blog" description="Latest news and updates from One" />
      <TopNav />

      <Container>
        <YStack pt="$12" pb="$8" gap="$6">
          <YStack gap="$2">
            <H1 size="$10">Blog</H1>
            <Paragraph size="$6" color="$color11">
              News, updates, and insights from the One team.
            </Paragraph>
          </YStack>

          <YStack gap="$4">
            {frontmatters.map((post) => {
              const author = post.by ? authors[post.by as keyof typeof authors] : null;
              const date = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null;

              return (
                <Link key={post.slug} href={`/blog/${post.slug.replace("blog/", "")}`}>
                  <YStack
                    p="$5"
                    hoverStyle={{
                      borderColor: "$color8",
                      backgroundColor: "$background025",
                    }}
                    pressStyle={{
                      borderColor: "$color8",
                      backgroundColor: "$background05",
                    }}
                    animation="100ms"
                  >
                    <YStack gap="$2">
                      <H2 size="$7" fontWeight="600">
                        {post.title}
                      </H2>
                      {post.description && (
                        <Paragraph size="$5" color="$color11">
                          {post.description}
                        </Paragraph>
                      )}
                      <XStack gap="$3" mt="$2">
                        {author && (
                          <SizableText size="$3" color="$color10">
                            {author.name}
                          </SizableText>
                        )}
                        {date && (
                          <SizableText size="$3" color="$color10">
                            {date}
                          </SizableText>
                        )}
                        {post.readingTime && (
                          <SizableText size="$3" color="$color10">
                            {post.readingTime.text}
                          </SizableText>
                        )}
                      </XStack>
                    </YStack>
                  </YStack>
                </Link>
              );
            })}
          </YStack>
        </YStack>
      </Container>
    </>
  );
}
