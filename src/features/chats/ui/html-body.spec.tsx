import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { HtmlBody, HtmlProvider } from './html-body';

describe('HtmlBody', () => {
  it('허용 태그만 그리고 링크는 바깥 브라우저로 연다', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(
      <HtmlProvider>
        <HtmlBody html='<p>안내 <a href="https://caquick.site/faq" onclick="x()">자세히</a></p><script>alert(1)</script>' />
      </HtmlProvider>,
    );
    expect(screen.queryByText(/alert/)).toBeNull();
    await fireEvent.press(screen.getByRole('link'));
    expect(open).toHaveBeenCalledWith('https://caquick.site/faq');
    open.mockRestore();
  });
});
