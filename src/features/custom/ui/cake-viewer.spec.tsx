import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { type CakeRender } from '../model/render-input';
import { CakeViewer } from './cake-viewer';

const mockViewer = jest.fn();
jest.mock('./three/cake-viewer', () => ({
  __esModule: true,
  default: (props: unknown) => mockViewer(props) as unknown,
}));

const RENDER: CakeRender = {
  shape: 'circle',
  design: null,
  color: '#FFFFFF',
  scale: 1,
  decals: [],
};

describe('CakeViewer(지연 로드)', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('three 화면을 처음 그릴 때 불러와 같은 값을 넘긴다', async () => {
    mockViewer.mockImplementation(() => <Text>3D</Text>);
    const onError = jest.fn();
    await render(<CakeViewer render={RENDER} request={{ yaw: 1 }} onError={onError} />);
    expect(await screen.findByText('3D')).toBeTruthy();
    expect(mockViewer).toHaveBeenLastCalledWith({ render: RENDER, request: { yaw: 1 }, onError });
  });

  it('캔버스 안에서 던진 오류(GL 실패 등)는 알리고 아무것도 그리지 않는다', async () => {
    mockViewer.mockImplementation(() => {
      throw new Error('GL context');
    });
    const onError = jest.fn();
    await render(<CakeViewer render={RENDER} request={{ yaw: 0 }} onError={onError} />);
    await screen.findByText(/.*/, {}, { timeout: 50 }).catch(() => undefined);
    expect(onError).toHaveBeenCalledWith(new Error('GL context'));
    expect(screen.toJSON()).toBeNull();
  });
});
