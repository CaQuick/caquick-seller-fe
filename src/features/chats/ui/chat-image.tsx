import { useState } from 'react';
import { Pressable } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { ImageViewer, RemoteImage } from '@/shared/ui';

import { CHATS_COPY } from '../model/copy';

const SIZE = 200;

/** 사진 메시지 200×200. 누르면 전체 화면으로 연다 */
export function ChatImage({ uri, sending = false }: { uri: string; sending?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={CHATS_COPY.photoOpen}
        onPress={() => setOpen(true)}
        className={cn(sending && 'opacity-60')}
      >
        <RemoteImage
          uri={uri}
          style={{ width: SIZE, height: SIZE }}
          className="rounded-xl bg-gray2"
        />
      </Pressable>
      <ImageViewer
        images={[uri]}
        labels={[CHATS_COPY.photo]}
        index={open ? 0 : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
