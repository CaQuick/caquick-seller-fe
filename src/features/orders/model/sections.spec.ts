import { groupByPickupDay } from './sections';

const TODAY = { y: 2026, m: 10, d: 6 };
const at = (id: string, pickupAt: string) => ({ id, pickupAt });

describe('groupByPickupDay', () => {
  it('KST 날짜로 묶고 픽업 시각 오름차순으로 둔다', () => {
    const sections = groupByPickupDay(
      [
        at('late', '2026-10-08T07:30:00.000Z'), // 10/8 16:30
        at('midnight', '2026-10-07T15:30:00.000Z'), // 10/8 00:30 — UTC로는 10/7
        at('today', '2026-10-06T08:00:00.000Z'), // 10/6 17:00
        at('sat', '2026-10-10T03:00:00.000Z'),
      ],
      TODAY,
    );
    expect(sections.map((s) => [s.title, s.count, s.data.map((d) => d.id)])).toEqual([
      ['오늘', '10월 6일 (화) · 1건', ['today']],
      ['10월 8일 (목)', '2건', ['midnight', 'late']],
      ['10월 10일 (토)', '1건', ['sat']],
    ]);
  });

  it('해가 다르면 연도를 붙인다', () => {
    expect(groupByPickupDay([at('1', '2027-01-02T03:00:00.000Z')], TODAY)[0]?.title).toBe(
      '2027년 1월 2일 (토)',
    );
  });

  it('빈 목록은 빈 섹션', () => {
    expect(groupByPickupDay([], TODAY)).toEqual([]);
  });
});
