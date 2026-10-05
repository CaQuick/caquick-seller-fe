import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/shared/lib/cn';

type Edge = 'top' | 'bottom';

interface Props {
  children: ReactNode;
  /** 헤더가 있는 화면은 top을 뺀다(네비게이터가 처리) */
  edges?: Edge[];
  className?: string;
  testID?: string;
}

/** 화면 루트. RN SafeAreaView는 deprecated라 insets를 padding으로 준다(edge-to-edge). */
export function Screen({ children, edges = ['top', 'bottom'], className, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      className={cn('flex-1 bg-bg', className)}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      }}
    >
      {children}
    </View>
  );
}
