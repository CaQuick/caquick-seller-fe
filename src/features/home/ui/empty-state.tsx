import { Empty, Screen } from '@/shared/ui';

interface Props {
  title: string;
  message?: string;
}

/** 아직 내용이 없는 화면의 빈 상태 — 헤더 아래 전체를 채운다 */
export function EmptyState({ title, message }: Props) {
  return (
    <Screen edges={['bottom']} className="items-center justify-center">
      <Empty title={title} description={message} />
    </Screen>
  );
}
