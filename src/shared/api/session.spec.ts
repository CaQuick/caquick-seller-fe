import { getSessionHooks, refreshOnce, registerSessionHooks, resetSessionHooks } from './session';

describe('session hooks', () => {
  afterEach(() => resetSessionHooks());

  it('등록 전에는 토큰이 없고 refresh는 실패, onForbidden은 아무것도 하지 않는다', async () => {
    expect(getSessionHooks().getAccessToken()).toBeNull();
    await expect(refreshOnce()).resolves.toBe(false);
    expect(() => getSessionHooks().onForbidden('ACCOUNT_NOT_ACTIVE')).not.toThrow();
  });

  it('일부만 등록하면 나머지는 기본값을 유지한다', () => {
    registerSessionHooks({ getAccessToken: () => 'tok' });
    expect(getSessionHooks().getAccessToken()).toBe('tok');
    expect(() => getSessionHooks().onForbidden('PASSWORD_CHANGE_REQUIRED')).not.toThrow();
  });

  it('동시에 여러 번 불러도 refresh는 한 번만 돈다', async () => {
    let calls = 0;
    let release!: (v: boolean) => void;
    registerSessionHooks({
      getAccessToken: () => 'tok',
      refresh: () => {
        calls += 1;
        return new Promise<boolean>((r) => {
          release = r;
        });
      },
    });
    const a = refreshOnce();
    const b = refreshOnce();
    release(true);
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
    expect(calls).toBe(1);

    // 끝난 뒤에는 다시 돈다
    const c = refreshOnce();
    release(false);
    await expect(c).resolves.toBe(false);
    expect(calls).toBe(2);
  });

  it('반증: refresh가 거부돼도 in-flight가 풀려 다음 호출이 다시 돈다', async () => {
    let calls = 0;
    registerSessionHooks({
      refresh: () => {
        calls += 1;
        return Promise.reject(new Error('net'));
      },
    });
    await expect(refreshOnce()).rejects.toThrow('net');
    await expect(refreshOnce()).rejects.toThrow('net');
    expect(calls).toBe(2);
  });
});
