import { render } from '@testing-library/react-native';
import { Toaster, toast } from 'sonner-native';

import { AppToaster, showToast } from './toast';

jest.mock('sonner-native', () => ({
  Toaster: jest.fn(() => null),
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

describe('toast', () => {
  it('success·error·info·dismiss가 sonner-native로 간다', () => {
    showToast.success('저장했어요');
    showToast.error('실패했어요');
    showToast.info('안내');
    showToast.dismiss();
    expect(toast.success).toHaveBeenCalledWith('저장했어요');
    expect(toast.error).toHaveBeenCalledWith('실패했어요');
    expect(toast).toHaveBeenCalledWith('안내');
    expect(toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it('AppToaster는 상단·라이트 고정으로 Toaster를 그린다', async () => {
    await render(<AppToaster />);
    expect(Toaster).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Toaster).mock.calls[0]![0]).toMatchObject({
      position: 'top-center',
      theme: 'light',
    });
  });
});
