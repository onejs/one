import { useState, useRef } from "react";
import { DocumentPickerResult } from "expo-document-picker";
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  CameraCapturedPicture,
} from "expo-camera";
import { Button, ButtonProps, Text, View } from "tamagui";
import { StyleSheet } from "react-native";

export default function CameraButton({
  children,
  onChange,
  ...buttonProps
}: ButtonProps & { onChange: (doc: DocumentPickerResult) => Promise<void> }) {
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  return (
    <>
      {showCamera && (
        <CameraView
          style={styles.camera}
          facing="front"
          mode="picture"
          ref={cameraRef}
        >
          <View>
            <Button
              onPress={async () => {
                const photo: CameraCapturedPicture =
                  await cameraRef.current?.takePictureAsync();
                if (photo) {
                  const documentPickerResult: DocumentPickerResult = {
                    canceled: false,
                    assets: [
                      {
                        uri: photo.uri,
                        name: photo.uri.split("/").pop() || "photo.jpg",
                        size: photo.uri.length,
                        mimeType: "image/jpeg",
                      },
                    ],
                  };
                  await onChange(documentPickerResult);
                }
              }}
            >
              <Text>Take Picture</Text>
            </Button>
          </View>
        </CameraView>
      )}
      {permission?.granted ? (
        <Button
          {...buttonProps}
          onPress={() => {
            setShowCamera(true);
          }}
        >
          {children}
        </Button>
      ) : (
        <View>
          <Text>We need your permission to show the camera</Text>
          <Button onPress={requestPermission} title="grant permission" />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    height: 200,
  },
});
