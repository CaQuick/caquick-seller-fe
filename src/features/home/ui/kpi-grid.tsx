import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { shadow } from '@/shared/config/tokens';

import { type Kpi } from '../model/home';

function KpiCard({ kpi }: { kpi: Kpi }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kpi.label} ${kpi.value}, ${kpi.hint}`}
      onPress={() => router.navigate(kpi.href)}
      style={shadow.native.card}
      className="flex-1 rounded-xl bg-surface px-4 pb-[11px] pt-[13px]"
    >
      <Text className="font-sans text-xs tracking-tight text-muted">{kpi.label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className="mt-[9px] font-sans text-3xl font-bold leading-6 tracking-tight text-text"
      >
        {kpi.value}
      </Text>
      <Text className="mt-2 font-sans text-xs font-semibold tracking-tight text-accent">
        {kpi.hint}
      </Text>
    </Pressable>
  );
}

/** KPI 2×2(.kpis) */
export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <View className="gap-2.5 px-[18px] pt-[42px]">
      {[kpis.slice(0, 2), kpis.slice(2)].map((row, i) => (
        <View key={i} className="flex-row gap-2.5">
          {row.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </View>
      ))}
    </View>
  );
}
