import { ChevronLeft } from "@tamagui/lucide-icons";
import { getMDXComponent } from "mdx-bundler/client";
import { createRoute, Link, useLoader } from "one";
import { useMemo } from "react";
import { H1, Paragraph, Separator, SizableText, Text, XStack } from "tamagui";
import { TopNav } from "~/components/TopNav";
import { authors } from "~/data/authors";
import { components } from "~/features/docs/MDXComponents";
import { Container } from "~/features/site/Containers";
import { HeadInfo } from "~/features/site/HeadInfo";

const route = createRoute<"/blog/[slug]">();

export async function generateStaticParams() {
  const { getAllFrontmatter } = await import("@vxrn/mdx");
  const frontmatters = getAllFrontmatter("data/blog");
  return frontmatters.map(({ slug }) => ({
    slug: slug.replace("blog/", ""),
  }));
}

export const loader = route.createLoader(async ({ params }) => {
  const { getMDXBySlug } = await import("@vxrn/mdx");
  const { frontmatter, code } = await getMDXBySlug("data/blog", params.slug);
  return {
    frontmatter,
    code,
  };
});

export default function BlogPost() {
  const { code, frontmatter } = useLoader(loader);
  const Component = useMemo(() => getMDXComponent(code), [code]);

  const author = frontmatter.by ? authors[frontmatter.by as keyof typeof authors] : null;
  const date = frontmatter.publishedAt
    ? new Date(frontmatter.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <>
      <HeadInfo title={frontmatter.title} description={frontmatter.description} />
      <TopNav />

      <Container>
        <Link href="/blog">
          <XStack gap="$2" ai="center" mb="$4">
            <ChevronLeft size={16} />
            <SizableText size="$3">Back to Blog</SizableText>
          </XStack>
        </Link>

        <H1
          size="$10"
          mt="$4"
          mb="$3"
          $platform-web={{
            textWrap: "balance",
          }}
        >
          {frontmatter.title}
        </H1>

        {frontmatter.description && (
          <Paragraph size="$6" color="$color11" mb="$3">
            {frontmatter.description}
          </Paragraph>
        )}

        <XStack gap="$3" ai="center" mb="$6">
          {author && (
            <SizableText size="$4" fontWeight="500">
              {author.name}
            </SizableText>
          )}
          {author && date && <Text color="$color10">·</Text>}
          {date && (
            <SizableText size="$4" color="$color10">
              {date}
            </SizableText>
          )}
          {frontmatter.readingTime && (
            <>
              <Text color="$color10">·</Text>
              <SizableText size="$4" color="$color10">
                {frontmatter.readingTime.text}
              </SizableText>
            </>
          )}
        </XStack>

        <Separator mb="$6" />

        <Component components={components as any} />
      </Container>
    </>
  );
}
