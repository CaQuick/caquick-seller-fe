import { type DesignItem } from '../design-json';
import { decalLabel, decalPixelSize } from './decal-geometry';

const text = (value: string): DesignItem => ({
  kind: 'TEXT',
  x: 0.5,
  y: 0.5,
  size: 10,
  effect: { type: 'none', intensity: 0 },
  text: value,
  color: '#1D1D1D',
});

describe('decalLabel', () => {
  // Canvas 2D는 ASCII 공백(\t\n\f\r)만 공백으로 바꾼다. 그 밖의 공백 문자는 그대로 재고 그린다
  it('줄바꿈·탭·폼피드·CR만 공백으로 바꾸고 폭 측정도 그 문자열로 한다', () => {
    expect(decalLabel('생일\n축하\t해\f요\r!')).toBe('생일 축하 해 요 !');
    expect(decalLabel('a b　c\vd')).toBe('a b　c\vd');

    const measured: string[] = [];
    decalPixelSize(text('HAPPY\nDAY'), (value) => {
      measured.push(value);
      return 0;
    });
    expect(measured).toEqual(['HAPPY DAY']);
  });
});
