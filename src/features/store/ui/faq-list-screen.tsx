import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { type AccessibilityActionEvent, Pressable, ScrollView, Text, View } from 'react-native';
import Sortable from 'react-native-sortables';

import { colors, shadow } from '@/shared/config/tokens';
import {
  AppHeader,
  Button,
  ConfirmSheet,
  Empty,
  Icon,
  Screen,
  showToast,
  Switch,
} from '@/shared/ui';

import { deleteFaqTopic, updateFaqTopic } from '../api/faq';
import { faqTopicsQueryOptions } from '../api/my-store';
import { storeKeys } from '../api/queryKeys';
import { FAQ_COPY, moveId, sortOrderUpdates } from '../model/faq';
import { storeErrorMessage } from '../model/messages';
import { FieldLabel, InfoBox, QueryGate } from './parts';

interface Topic {
  id: string;
  title: string;
  isActive: boolean;
  sortOrder: number;
}

const openEdit = (id: string) => router.push({ pathname: '/store/faq/[id]', params: { id } });

interface RowProps {
  topic: Topic;
  onToggle: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  busy: boolean;
}

/** 행(.mrow): 순서 핸들 · 제목(누르면 편집) · 활성 스위치 · × */
function TopicRow({ topic, onToggle, onDelete, onMove, busy }: RowProps) {
  const onAction = (e: AccessibilityActionEvent) =>
    onMove(topic.id, e.nativeEvent.actionName === 'increment' ? -1 : 1);
  return (
    <View className="min-h-14 flex-row items-center gap-3 border-t border-line2 bg-surface px-4 py-2.5">
      <Sortable.Handle>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${topic.title} 순서`}
          accessibilityHint="위아래로 쓸어 순서를 바꿔요"
          accessibilityActions={[
            { name: 'increment', label: '위로 이동' },
            { name: 'decrement', label: '아래로 이동' },
          ]}
          onAccessibilityAction={onAction}
          className="h-11 w-9 items-center justify-center"
        >
          <Icon name="faq" size={20} color={colors.chevron} />
        </View>
      </Sortable.Handle>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${topic.title} 편집`}
        onPress={() => openEdit(topic.id)}
        className="min-h-11 flex-1 justify-center"
      >
        <Text numberOfLines={1} className="font-sans text-md font-medium tracking-tight text-text">
          {topic.title}
        </Text>
      </Pressable>
      <Switch
        value={topic.isActive}
        onValueChange={() => onToggle(topic)}
        accessibilityLabel={`${topic.title} 활성`}
        disabled={busy}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${topic.title} 삭제`}
        onPress={() => onDelete(topic)}
        hitSlop={6}
        className="h-11 w-8 items-center justify-center"
      >
        <Text className="font-sans text-3xl text-muted">×</Text>
      </Pressable>
    </View>
  );
}

/** 자동응답(FAQ) 목록: 활성·순서는 행에서 바로 저장, 제목·답변은 편집 화면에서 */
export function StoreFaqListScreen() {
  const queryClient = useQueryClient();
  const topics = useQuery(faqTopicsQueryOptions());
  // 드래그로 바꾼 순서 — 저장이 끝나고 다시 받을 때까지 이 순서로 그린다
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [target, setTarget] = useState<Topic | null>(null);
  const sheet = useRef<BottomSheetModal>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: storeKeys.faqTopics() });

  const toggle = useMutation({
    mutationFn: (t: Topic) => updateFaqTopic({ topicId: t.id, isActive: !t.isActive }),
    onSuccess: refresh,
    onError: (e) => showToast.error(storeErrorMessage(e)),
  });
  const reorder = useMutation({
    mutationFn: (updates: { topicId: string; sortOrder: number }[]) =>
      Promise.all(updates.map((u) => updateFaqTopic(u))),
    onSuccess: () => showToast.success(FAQ_COPY.orderSaved),
    onError: (e) => showToast.error(storeErrorMessage(e)),
    onSettled: async () => {
      await refresh();
      setPendingOrder(null);
    },
  });
  const remove = useMutation({
    mutationFn: (t: Topic) => deleteFaqTopic(t.id),
    onSuccess: async () => {
      sheet.current?.dismiss();
      showToast.success(FAQ_COPY.deleted);
      await refresh();
    },
    onError: (e) => showToast.error(storeErrorMessage(e)),
  });

  const list = topics.data ?? [];
  const byId = new Map(list.map((t) => [t.id, t]));
  const ordered = pendingOrder ? pendingOrder.flatMap((id) => byId.get(id) ?? []) : list;
  const saveOrder = (ids: string[]) => {
    const updates = sortOrderUpdates(list, ids);
    if (updates.length === 0 || reorder.isPending) return;
    setPendingOrder(ids);
    reorder.mutate(updates);
  };
  const askDelete = (t: Topic) => {
    setTarget(t);
    sheet.current?.present();
  };
  const add = () => openEdit('new');

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="자동응답(FAQ)" right={{ label: '항목 추가', onPress: add }} />
      {topics.data ? (
        <ScrollView contentContainerClassName="px-5 pb-6">
          {ordered.length > 0 ? (
            <>
              <InfoBox className="mt-5">{FAQ_COPY.hint}</InfoBox>
              <FieldLabel>{`항목 ${ordered.length}`}</FieldLabel>
              <View style={shadow.native.card} className="overflow-hidden rounded-xl bg-surface">
                {/* 첫 행의 위 구분선을 카드 밖으로 밀어 가린다 */}
                <View className="-mt-px">
                  <Sortable.Grid
                    data={ordered}
                    keyExtractor={(t) => t.id}
                    columns={1}
                    customHandle
                    sortEnabled={!reorder.isPending}
                    onDragEnd={({ data }) => saveOrder(data.map((t) => t.id))}
                    renderItem={({ item }) => (
                      <TopicRow
                        topic={item}
                        busy={toggle.isPending}
                        onToggle={(t) => toggle.mutate(t)}
                        onDelete={askDelete}
                        onMove={(id, delta) =>
                          saveOrder(
                            moveId(
                              ordered.map((t) => t.id),
                              id,
                              delta,
                            ),
                          )
                        }
                      />
                    )}
                  />
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="항목 추가"
                onPress={add}
                className="mt-4 h-12 items-center justify-center rounded-sm border border-dashed border-border"
              >
                <Text className="font-sans text-base tracking-tight text-border">+ 항목 추가</Text>
              </Pressable>
            </>
          ) : (
            <Empty
              icon="autoReply"
              title={FAQ_COPY.emptyTitle}
              description={FAQ_COPY.emptyDescription}
              action={<Button title="항목 추가" size="sm" onPress={add} />}
            />
          )}
        </ScrollView>
      ) : (
        <QueryGate
          isPending={topics.isPending}
          error={topics.error}
          onRetry={() => void topics.refetch()}
        />
      )}
      <ConfirmSheet
        ref={sheet}
        title={FAQ_COPY.deleteTitle}
        description={target ? `'${target.title}' — ${FAQ_COPY.deleteDescription}` : undefined}
        confirmLabel="삭제"
        loading={remove.isPending}
        onConfirm={() => target && remove.mutate(target)}
      />
    </Screen>
  );
}
