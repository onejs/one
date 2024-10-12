import { Text, View, XStack } from "tamagui";
import { useLoader, getURL, LoaderProps } from "one";

import { PageContainer } from "~/code/ui/PageContainer";
import { PhotoCard } from "~/code/photos/photo-card";
import { getPhoto } from "~/code/db";

export async function loader({ path, params }: LoaderProps) {
  const id = params.id;

  if (!id) {
    throw new Error("Invalid photo ID");
  }

  try {
    const url = new URL(getURL() + path);
    const urlBase = url.origin;
    const photo = getPhoto(id);

    if (!photo) {
      throw new Error("Photo not found");
    }

    photo.url = `${urlBase}/public/uploads/${photo.path}`;

    return {
      photo,
    };
  } catch (error) {
    throw new Error(`Failed to fetch post: ${(error as Error).message}`);
  }
}

export default () => <PhotoPage />;

export function PhotoPage() {
  const { photo } = useLoader(loader);

  if (!photo) {
    return null;
  }

  return (
    <>
      <PageContainer>
        <XStack>
          <View width="50%" padding="$4">
            <PhotoCard {...photo} />
          </View>
          <View width="50%" padding="$4">
            <Text fontSize="$8">{photo.name}</Text>
            <Text fontSize="$4" mt="$2">
              {photo.description}
            </Text>
          </View>
        </XStack>
      </PageContainer>
    </>
  );
}
