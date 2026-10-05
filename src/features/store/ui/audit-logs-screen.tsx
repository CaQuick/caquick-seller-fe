import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { type AuditActionType, type AuditTargetType } from '@/graphql/generated/graphql';
import { cn } from '@/shared/lib/cn';
import { Button, Chip, Empty, StatusChip } from '@/shared/ui';

import { auditLogsQueryOptions } from '../api/audit';
import {
  ACTION_VIEW,
  AUDIT_COPY,
  AUDIT_FILTERS,
  type AuditLogLike,
  describeAudit,
  diffText,
  formatAuditAt,
} from '../model/audit';
import { QueryGate, SubScreen } from './parts';

interface Log extends AuditLogLike {
  id: string;
  action: AuditActionType;
  createdAt: string;
}

/** 타임라인 행(.tl.done): 점·세로선 · 대상 + 동작 칩 · 시각. 변경이 있으면 눌러 diff를 펼친다 */
function AuditRow({ log, last }: { log: Log; last: boolean }) {
  const [open, setOpen] = useState(false);
  const { title, diff } = describeAudit(log);
  const action = ACTION_VIEW[log.action];
  const at = formatAuditAt(log.createdAt);
  const expandable = diff.length > 0;
  const body = (
    <>
      <View className="flex-row flex-wrap items-center gap-1.5">
        <Text className="shrink font-sans text-md font-semibold tracking-tight text-text">
          {title}
        </Text>
        <StatusChip tone={action.tone} label={action.label} />
      </View>
      <Text className="mt-0.5 font-sans text-xs tracking-tight text-muted">{at}</Text>
      {open ? (
        <Text className="mt-1.5 rounded-md bg-tint2 px-2.5 py-2 font-sans text-sm tracking-tight text-text3">
          {diffText(diff)}
        </Text>
      ) : null}
    </>
  );
  return (
    <View className={cn('flex-row gap-2.5', !last && 'pb-[18px]')}>
      {last ? null : <View className="absolute bottom-0 left-[9px] top-4 w-0.5 bg-line" />}
      <View className="h-5 w-5 items-center justify-center">
        <View className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-primary" />
      </View>
      {expandable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title} ${action.label}, ${at}`}
          accessibilityState={{ expanded: open }}
          accessibilityHint={open ? '변경 내용을 접어요' : '변경 내용을 펼쳐요'}
          onPress={() => setOpen((v) => !v)}
          className="flex-1"
        >
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={`${title} ${action.label}, ${at}`} className="flex-1">
          {body}
        </View>
      )}
    </View>
  );
}

/** 조작 이력: 대상 종류 칩 · 최신순 타임라인 · 이전 이력 더보기 */
export function StoreAuditLogsScreen() {
  const [targetType, setTargetType] = useState<AuditTargetType | null>(null);
  const logs = useInfiniteQuery(auditLogsQueryOptions(targetType));
  const items = logs.data?.pages.flatMap((page) => page.items);

  return (
    <SubScreen title="조작 이력">
      <ScrollView contentContainerClassName="px-5 pb-6">
        <View className="mb-4 mt-5 flex-row flex-wrap gap-2">
          {AUDIT_FILTERS.map((f) => (
            <Chip
              key={f.label}
              variant="filter"
              label={f.label}
              selected={f.value === targetType}
              onPress={() => setTargetType(f.value)}
            />
          ))}
        </View>
        {!items ? (
          <View className="-mx-5">
            <QueryGate
              isPending={logs.isPending}
              error={logs.error}
              onRetry={() => void logs.refetch()}
            />
          </View>
        ) : items.length > 0 ? (
          <>
            <View className="py-1">
              {items.map((log, i) => (
                <AuditRow key={log.id} log={log} last={i === items.length - 1} />
              ))}
            </View>
            {logs.hasNextPage ? (
              <Button
                title={AUDIT_COPY.more}
                variant="secondary"
                className="mt-5"
                loading={logs.isFetchingNextPage}
                onPress={() => void logs.fetchNextPage()}
              />
            ) : null}
          </>
        ) : (
          <Empty
            icon="history"
            title={AUDIT_COPY.emptyTitle}
            description={AUDIT_COPY.emptyDescription}
          />
        )}
      </ScrollView>
    </SubScreen>
  );
}
