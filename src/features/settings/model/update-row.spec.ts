import { type UpdateSnapshot, updateRow } from './update-row';

const idle: UpdateSnapshot = {
  enabled: true,
  isChecking: false,
  isDownloading: false,
  isUpdateAvailable: false,
  isUpdatePending: false,
};
const now = new Date('2026-10-06T03:00:00.000Z');

describe('updateRow', () => {
  it.each<[string, Partial<UpdateSnapshot>, string, string | null]>([
    [
      'dev·업데이트 꺼짐',
      { enabled: false, isUpdatePending: true },
      '개발 빌드에서는 확인할 수 없어요',
      null,
    ],
    ['확인 중', { isChecking: true, isUpdateAvailable: true }, '확인 중…', null],
    ['받는 중', { isDownloading: true, isUpdateAvailable: true }, '새 버전을 받는 중…', null],
    [
      '받아 둠',
      { isUpdatePending: true, isUpdateAvailable: true },
      '새 버전을 받았어요 · 눌러서 다시 시작',
      'restart',
    ],
    ['새 버전 있음', { isUpdateAvailable: true }, '새 버전이 있어요 · 눌러서 받기', 'download'],
    ['확인한 적 없음', {}, '눌러서 확인', 'check'],
    [
      '오늘 확인함',
      { lastCheckedAt: new Date('2026-10-06T00:12:00.000Z') },
      '마지막 확인 오늘 09:12',
      'check',
    ],
  ])('%s', (_, patch, description, action) => {
    expect(updateRow({ ...idle, ...patch }, now)).toEqual({ description, action });
  });
});
