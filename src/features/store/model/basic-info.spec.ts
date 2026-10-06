import {
  type BasicInfoValues,
  basicInfoSchema,
  buildBasicInfoPatch,
  regionFromPick,
  regionLabel,
  toBasicInfoValues,
} from './basic-info';

const store = {
  storeName: '해즈 케이크',
  storePhone: '032-123-4567',
  addressFull: '청라커낼로 252 1층',
  addressCity: '인천',
  addressDistrict: '서구',
  addressNeighborhood: '청라동',
  mapProvider: 'NAVER' as const,
  websiteUrl: 'instagram.com/hazcake',
  businessHoursText: null,
  greetingMessage: '안녕하세요',
  profileImageUrl: null,
};
const initial = toBasicInfoValues(store);
const edit = (patch: Partial<BasicInfoValues>): BasicInfoValues => ({ ...initial, ...patch });

describe('toBasicInfoValues', () => {
  it('null 문구는 빈 입력칸으로, 주소 단위는 지역으로 묶는다', () => {
    expect(initial.businessHoursText).toBe('');
    expect(initial.region).toEqual({ city: '인천', district: '서구', neighborhood: '청라동' });
    expect(regionLabel(initial.region)).toBe('인천 서구 청라동');
    expect(regionLabel({ city: null, district: null, neighborhood: null })).toBeNull();
  });
});

describe('buildBasicInfoPatch', () => {
  it('아무것도 안 바꾸면 빈 입력', () => {
    expect(buildBasicInfoPatch(initial, edit({}))).toEqual({});
  });

  it('바꾼 필드만 담는다', () => {
    expect(buildBasicInfoPatch(initial, edit({ storeName: '해즈 케이크 청라점' }))).toEqual({
      storeName: '해즈 케이크 청라점',
    });
  });

  it('앞뒤 공백만 다르면 바뀐 것으로 보지 않고, 바뀐 값은 다듬어 보낸다', () => {
    expect(buildBasicInfoPatch(initial, edit({ storePhone: ' 032-123-4567 ' }))).toEqual({});
    expect(buildBasicInfoPatch(initial, edit({ storePhone: ' 032-999-0000 ' }))).toEqual({
      storePhone: '032-999-0000',
    });
  });

  it('비운 문구는 빈 문자열로 보내 BE가 지운다(인사말은 기본 문구로)', () => {
    expect(buildBasicInfoPatch(initial, edit({ greetingMessage: '  ', websiteUrl: '' }))).toEqual({
      greetingMessage: '',
      websiteUrl: '',
    });
  });

  it('지역을 바꾸면 시·도/시군구를 보내고 이전 동 이름을 비운다', () => {
    const region = regionFromPick({ parentName: '서울 남부', name: '강남구' });
    expect(buildBasicInfoPatch(initial, edit({ region }))).toEqual({
      addressCity: '서울 남부',
      addressDistrict: '강남구',
      addressNeighborhood: null,
    });
  });

  it('지도 제공자·로고', () => {
    expect(
      buildBasicInfoPatch(
        initial,
        edit({ mapProvider: 'NONE', profileImageUrl: 'https://cdn.test/logo.jpg' }),
      ),
    ).toEqual({ mapProvider: 'NONE', profileImageUrl: 'https://cdn.test/logo.jpg' });
  });
});

describe('basicInfoSchema', () => {
  it.each([
    ['storeName', '', '매장명을 입력해 주세요.'],
    ['storeName', '   ', '매장명을 입력해 주세요.'],
    ['storePhone', '', '전화번호를 입력해 주세요.'],
    ['addressFull', '', '상세 주소를 입력해 주세요.'],
    ['greetingMessage', 'a'.repeat(501), '인사말은 500자 이하입니다.'],
  ] as const)('%s=%p → %s', (field, value, message) => {
    const result = basicInfoSchema.safeParse(edit({ [field]: value }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it('선택 문구는 비워도 통과한다', () => {
    expect(
      basicInfoSchema.safeParse(
        edit({ websiteUrl: '', businessHoursText: '', greetingMessage: '' }),
      ).success,
    ).toBe(true);
  });
});
