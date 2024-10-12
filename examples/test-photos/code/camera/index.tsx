import { getDocumentAsync, DocumentPickerResult } from "expo-document-picker";
import { Button, ButtonProps } from "tamagui";

export default function CameraButton({
  children,
  onChange,
  ...buttonProps
}: ButtonProps & { onChange: (doc: DocumentPickerResult) => Promise<void> }) {
  return (
    <Button
      {...buttonProps}
      onPress={async () => {
        onChange(await getDocumentAsync());
      }}
    >
      {children}
    </Button>
  );
}
