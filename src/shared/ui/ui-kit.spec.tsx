import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  ActionBar,
  AppHeader,
  Chip,
  ImageDropzone,
  MenuGroup,
  MenuRow,
  Screen,
  SelectField,
  StepProgress,
  Switch,
  TagChip,
  TextField,
} from './index';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
};
const EVENTS = ['생일', '크리스마스', '연인'] as const;

/** 사용 예: 상품 등록 1/3 화면 조립 — 헤더·진행·폼·칩·메뉴·하단 바 */
function ProductBasicExample({ onNext }: { onNext: (name: string, event: string) => void }) {
  const [name, setName] = useState('');
  const [event, setEvent] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  return (
    <Screen edges={['top']}>
      <AppHeader title="상품 등록" onBack={() => undefined} />
      <StepProgress step={1} label="기본 정보" />
      <ScrollView contentContainerClassName="px-5 gap-4">
        <ImageDropzone count={0} onPress={() => undefined} />
        <TextField
          label="상품명"
          placeholder="상품명을 입력하세요"
          value={name}
          onChangeText={setName}
        />
        <SelectField label="카테고리" value={event} onPress={() => setEvent('생일')} />
        <View className="flex-row flex-wrap gap-2">
          {EVENTS.map((e) => (
            <Chip key={e} label={e} selected={e === event} onPress={() => setEvent(e)} />
          ))}
        </View>
        <TagChip label="#트리" onRemove={() => undefined} />
        <MenuGroup>
          <MenuRow
            title="판매 중"
            accessory={
              <Switch value={visible} onValueChange={setVisible} accessibilityLabel="판매 중" />
            }
          />
        </MenuGroup>
      </ScrollView>
      <ActionBar
        secondary={{ title: '임시저장' }}
        primary={{
          title: '다음',
          variant: name && event ? 'primary' : 'soft',
          disabled: !name || !event,
          onPress: () => onNext(name, event!),
        }}
      />
    </Screen>
  );
}

describe('UI 키트 사용 예', () => {
  it('필수값을 채우기 전에는 다음이 꺼져 있고, 채우면 값을 넘긴다', async () => {
    const onNext = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ProductBasicExample onNext={onNext} />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('header', { name: '상품 등록' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '1/3 기본 정보' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('상품명'), '크리스마스 눈사람');
    await fireEvent.press(screen.getByRole('button', { name: '크리스마스' }));
    expect(screen.getByRole('button', { name: '카테고리' })).toHaveAccessibilityValue({
      text: '크리스마스',
    });
    expect(screen.getByRole('button', { name: '크리스마스' })).toBeSelected();

    await fireEvent.press(screen.getByRole('switch', { name: '판매 중' }));
    expect(screen.getByRole('switch', { name: '판매 중' })).not.toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(onNext).toHaveBeenCalledWith('크리스마스 눈사람', '크리스마스');
  });
});
