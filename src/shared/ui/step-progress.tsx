import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

type Step = 1 | 2 | 3;

/** 단계별 트랙·칸 색(.step / .two / .three). 시안대로 3단계는 앞 칸을 채우지 않는다 */
const BAR: Record<Step, { track: string; cells: [string, string, string] }> = {
  1: { track: 'bg-track', cells: ['bg-primary-strong', '', ''] },
  2: { track: 'bg-track2', cells: ['bg-step-done', 'bg-step-now', ''] },
  3: { track: 'bg-track', cells: ['', '', 'bg-step-last'] },
};

/** 상품 등록 진행 표시('1/3 기본 정보' + 9px 3분할 막대) */
export function StepProgress({ step, label }: { step: Step; label: string }) {
  const { track, cells } = BAR[step];
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${step}/3 ${label}`}
      accessibilityValue={{ min: 1, max: 3, now: step }}
      className="px-5 pt-[29px]"
    >
      <Text className="mb-[13px] font-sans text-md font-medium tracking-tight text-muted">
        {`${step}/3 ${label}`}
      </Text>
      <View className={cn('h-[9px] flex-row overflow-hidden rounded-[5px]', track)}>
        {cells.map((color, i) => (
          <View
            key={i}
            testID={color ? 'step-filled' : 'step-empty'}
            className={cn('flex-1', color, step === 1 && i === 0 && 'rounded-r-[4px]')}
          />
        ))}
      </View>
    </View>
  );
}
