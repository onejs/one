import { Paragraph, Image, Card } from "tamagui";
import { Photo } from "~/code/db";

export const PhotoCard = (props: Photo) => {
  const targetWidth = 500;
  const targetHeight = 300;
  const aspectRatio = props.width / props.height;
  const targetAspectRatio = targetWidth / targetHeight;

  let width = targetWidth;
  let height = targetHeight;

  if (aspectRatio > targetAspectRatio) {
    width = targetHeight * aspectRatio;
  } else {
    height = targetWidth / aspectRatio;
  }

  return (
    <Card elevate size="$4" bordered height={300}>
      <Card.Header padded>
        <Paragraph theme="alt1" size="$8" color="white" fontWeight="bold">
          {props.name}
        </Paragraph>
      </Card.Header>
      <Card.Background>
        <Image
          objectFit="cover"
          resizeMode="cover"
          alignSelf="center"
          width="100%"
          height="100%"
          source={{
            width,
            height,
            uri: props.url,
          }}
          radius="$4"
        />
      </Card.Background>
    </Card>
  );
};
