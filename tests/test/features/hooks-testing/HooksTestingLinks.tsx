import { Link } from "one";
import { View, Text } from "tamagui";

export function HooksTestingLinks() {
  return (
    <View>
      <Link href="/hooks/contents/page-1">
        <Text>Go to page-1</Text>
      </Link>
      <Link href="/hooks/contents/page-2">
        <Text>Go to page-2</Text>
      </Link>

      <Link href="/hooks/contents/with-slug/slug-page-foo">
        <Text>Go to with-slug/slug-page-foo</Text>
      </Link>
      <Link href="/hooks/contents/with-slug/slug-page-bar">
        <Text>Go to with-slug/slug-page-bar</Text>
      </Link>

      <Link href="/hooks/contents/with-nested-slug/foo/bar">
        <Text>Go to with-nested-slug/foo/bar</Text>
      </Link>
      <Link href="/hooks/contents/with-nested-slug/abc/def">
        <Text>Go to with-nested-slug/abc/def</Text>
      </Link>

      <Link href="/hooks">
        <Text>Go to index</Text>
      </Link>
    </View>
  );
}
