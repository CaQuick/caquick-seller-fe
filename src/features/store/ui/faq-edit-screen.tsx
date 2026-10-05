import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { HtmlBody, HtmlProvider } from '@/features/chats';
import {
  ActionBar,
  Button,
  Chip,
  ConfirmSheet,
  Empty,
  MenuGroup,
  MenuRow,
  showToast,
  Switch,
  TextField,
} from '@/shared/ui';

import { createFaqTopic, deleteFaqTopic, updateFaqTopic } from '../api/faq';
import { faqTopicsQueryOptions } from '../api/my-store';
import { storeKeys } from '../api/queryKeys';
import {
  FAQ_COPY,
  FAQ_TITLE_MAX,
  htmlToText,
  nextSortOrder,
  type Selection,
  textToHtml,
  toggleBold,
  toggleList,
  validateFaq,
} from '../model/faq';
import { storeErrorMessage } from '../model/messages';
import { FieldLabel, QueryGate, SubScreen } from './parts';

interface Topic {
  id: string;
  title: string;
  answerHtml: string;
  isActive: boolean;
  sortOrder: number;
}

interface FormProps {
  topic: Topic | null;
  topics: readonly Topic[];
}

function FaqForm({ topic, topics }: FormProps) {
  const queryClient = useQueryClient();
  const [initialAnswer] = useState(() => (topic ? htmlToText(topic.answerHtml) : ''));
  const [title, setTitle] = useState(topic?.title ?? '');
  const [answer, setAnswer] = useState(initialAnswer);
  const [isActive, setIsActive] = useState(topic?.isActive ?? true);
  const selection = useRef<Selection>({ start: 0, end: 0 });
  // 서식 버튼 직후 한 번만 커서를 옮긴다 — 계속 제어하면 입력 중 커서가 튄다
  const [forcedSelection, setForcedSelection] = useState<Selection>();
  const [submitted, setSubmitted] = useState(false);
  const sheet = useRef<BottomSheetModal>(null);
  const errors = validateFaq(title, answer);
  const html = textToHtml(answer);

  const done = async (message: string) => {
    showToast.success(message);
    await queryClient.invalidateQueries({ queryKey: storeKeys.faqTopics() });
    if (router.canGoBack()) router.back();
    else router.replace('/store/faq');
  };
  const save = useMutation({
    mutationFn: () =>
      topic
        ? updateFaqTopic({
            topicId: topic.id,
            title: title.trim(),
            // 손대지 않은 답변은 보내지 않는다 — 편집 글로 옮기며 빠지는 서식(em 등)을 지킨다
            ...(answer === initialAnswer ? {} : { answerHtml: html }),
            isActive,
          })
        : createFaqTopic({
            title: title.trim(),
            answerHtml: html,
            isActive,
            sortOrder: nextSortOrder(topics),
          }),
    onSuccess: () => done(FAQ_COPY.saved),
    onError: (e) => showToast.error(storeErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => deleteFaqTopic(topic?.id ?? ''),
    onSuccess: () => {
      sheet.current?.dismiss();
      return done(FAQ_COPY.deleted);
    },
    onError: (e) => showToast.error(storeErrorMessage(e)),
  });

  const format = (apply: typeof toggleBold) => {
    const next = apply(answer, selection.current);
    setAnswer(next.text);
    selection.current = next.selection;
    setForcedSelection(next.selection);
  };
  const onSave = () => {
    setSubmitted(true);
    if (!errors.title && !errors.answer) save.mutate();
  };

  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-6">
        <FieldLabel first>제목</FieldLabel>
        <TextField
          accessibilityLabel="제목"
          placeholder="예: 픽업 안내"
          value={title}
          onChangeText={setTitle}
          maxLength={FAQ_TITLE_MAX}
          error={submitted ? errors.title : null}
        />
        <FieldLabel>답변</FieldLabel>
        <View className="mb-2 flex-row gap-2">
          <Chip variant="filter" label="굵게" onPress={() => format(toggleBold)} />
          <Chip variant="filter" label="• 목록" onPress={() => format(toggleList)} />
        </View>
        <TextField
          accessibilityLabel="답변"
          placeholder={FAQ_COPY.answerPlaceholder}
          multiline
          value={answer}
          onChangeText={setAnswer}
          selection={forcedSelection}
          onSelectionChange={(e) => {
            selection.current = e.nativeEvent.selection;
            setForcedSelection(undefined);
          }}
          error={submitted ? errors.answer : null}
        />
        <FieldLabel>미리보기</FieldLabel>
        <View
          testID="faq-preview"
          className="self-start rounded-xl rounded-bl-xs bg-tint px-3.5 py-2.5"
        >
          <Text className="mb-1 font-sans text-2xs font-semibold text-purple-text">자동 응답</Text>
          {html ? (
            <HtmlBody html={html} />
          ) : (
            <Text className="font-sans text-sm tracking-tight text-muted">
              {FAQ_COPY.previewEmpty}
            </Text>
          )}
        </View>
        <FieldLabel>노출</FieldLabel>
        <MenuGroup>
          <MenuRow
            title="활성"
            description={FAQ_COPY.activeHint}
            accessory={
              <Switch value={isActive} onValueChange={setIsActive} accessibilityLabel="활성" />
            }
          />
        </MenuGroup>
        {topic ? (
          <Button
            title="이 항목 삭제"
            variant="dangerOutline"
            className="mt-6"
            onPress={() => sheet.current?.present()}
          />
        ) : null}
      </ScrollView>
      <ActionBar primary={{ title: '저장', loading: save.isPending, onPress: onSave }} />
      <ConfirmSheet
        ref={sheet}
        title={FAQ_COPY.deleteTitle}
        description={FAQ_COPY.deleteDescription}
        confirmLabel="삭제"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}

/** 항목 편집: id가 'new'면 추가 */
export function StoreFaqEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topics = useQuery(faqTopicsQueryOptions());
  const isNew = id === 'new';
  const topic = topics.data?.find((t) => t.id === id) ?? null;

  return (
    <SubScreen title="항목 편집" actionBar={Boolean(topics.data && (isNew || topic))}>
      {!topics.data ? (
        <QueryGate
          isPending={topics.isPending}
          error={topics.error}
          onRetry={() => void topics.refetch()}
        />
      ) : isNew || topic ? (
        // 입력마다 폼이 다시 그려져도 렌더 엔진은 그대로 둔다
        <HtmlProvider>
          <FaqForm key={topic?.id ?? 'new'} topic={topic} topics={topics.data} />
        </HtmlProvider>
      ) : (
        <Empty icon="alert" title={FAQ_COPY.notFound} />
      )}
    </SubScreen>
  );
}
