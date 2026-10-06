import { createTestQueryClient } from './render';

/** gc 타이머가 남으면 단일 spec 실행에서 jest가 끝나지 않는다(기본 5분) */
describe('테스트 QueryClient', () => {
  it('끝난 쿼리를 관찰자가 없으면 바로 버린다', async () => {
    const client = createTestQueryClient();
    await client.prefetchQuery({ queryKey: ['k'], queryFn: () => Promise.resolve(1) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it('끝난 뮤테이션을 바로 버린다', async () => {
    const client = createTestQueryClient();
    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.resolve(1) })
      .execute(undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });
});
