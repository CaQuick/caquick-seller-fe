import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui';

import { CHATS_COPY } from '../model/copy';
import { MAX_TEXT_LENGTH } from '../model/use-chat-room';

interface Props {
  sending: boolean;
  onSend: (text: string) => void;
}

/** 입력바(.chatbar): 텍스트만(첨부 없음). 보내기는 글자가 있고 전송 중이 아닐 때만 */
export function ChatInputBar({ sending, onSend }: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !sending;
  const submit = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      className="flex-row items-center gap-2 border-t border-line bg-surface px-3 pt-2"
    >
      <TextInput
        accessibilityLabel={CHATS_COPY.inputPlaceholder}
        accessibilityState={{ disabled: sending }}
        value={text}
        onChangeText={setText}
        editable={!sending}
        maxLength={MAX_TEXT_LENGTH}
        multiline
        placeholder={CHATS_COPY.inputPlaceholder}
        placeholderTextColor={colors.placeholder}
        cursorColor={colors.caret}
        selectionColor={colors.caret}
        className="max-h-28 min-h-10 flex-1 rounded-md bg-gray2 px-3.5 py-2.5 font-sans text-md tracking-tight text-text"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={CHATS_COPY.send}
        accessibilityState={{ disabled: !canSend, busy: sending }}
        disabled={!canSend}
        onPress={submit}
        hitSlop={4}
        className={cn(
          'h-9 w-9 items-center justify-center rounded-md',
          canSend ? 'bg-primary' : 'bg-track',
        )}
      >
        <Icon name="send" size={20} color={canSend ? colors.surface : colors.placeholder} />
      </Pressable>
    </View>
  );
}
