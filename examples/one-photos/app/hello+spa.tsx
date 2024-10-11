import { useState } from "react";
import { Text, YStack, XStack, Input } from "tamagui";
import { Upload } from "@tamagui/lucide-icons";
import { Stack } from "one";
import { DocumentPickerResult } from "expo-document-picker";

import { PageContainer } from "~/code/ui/PageContainer";

import CameraView from "~/code/camera";

export default function UploadPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const upload = async (res: DocumentPickerResult) => {
    const file = res.assets?.[0];
    if (file && file.file) {
      const formData = new FormData();
      formData.append("file", file.file);
      formData.append("name", name);
      formData.append("description", description);

      await fetch("/api/upload", {
        method: "post",
        body: formData,
      });

      setName("");
      setDescription("");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Feed",
        }}
      />
      <PageContainer>
        <XStack alignItems="center" w="100%" paddingTop="$5">
          <YStack gap="$4" alignItems="left" maxWidth={300}>
            <Input
              size="$4"
              label="Name"
              required
              width={300}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              size="$4"
              label="Description"
              required
              width={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Text fontSize="$4">Upload a photo of your dog</Text>
            <CameraView
              themeInverse
              icon={Upload}
              size="$6"
              label="Upload"
              onChange={(files) => {
                return upload(files);
              }}
              width={300}
            ></CameraView>
          </YStack>
        </XStack>
      </PageContainer>
    </>
  );
}
