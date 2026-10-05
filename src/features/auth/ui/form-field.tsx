import { Text, type TextInputProps, View } from 'react-native';

import { Button, TextField } from '@/shared/ui';

interface Props extends Omit<TextInputProps, 'accessibilityLabel'> {
  label: string;
  error?: string;
}

/** 라벨 + 입력 + 필드 오류. 접근성 이름은 라벨과 같다 */
export function FormField({ label, error, ...input }: Props) {
  return <TextField label={label} error={error} {...input} />;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" className="rounded-sm bg-danger-bg px-3 py-2">
      <Text className="font-sans text-sm text-danger">{message}</Text>
    </View>
  );
}

export function SubmitButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return <Button title={label} loading={busy} onPress={onPress} className="mt-1" />;
}
