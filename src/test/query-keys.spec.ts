import { chatsKeys } from '@/features/chats';
import { homeKeys } from '@/features/home';
import { ordersKeys } from '@/features/orders';
import { productsKeys } from '@/features/products';
import { pushKeys } from '@/features/push';
import { reviewsKeys } from '@/features/reviews';
import { settingsKeys } from '@/features/settings';
import { storeKeys } from '@/features/store';
import { uploadsKeys } from '@/features/uploads';

/** 모든 키는 feature 접두로 시작해 invalidateQueries({ queryKey: xKeys.all })이 한 feature만 지운다 */
describe('쿼리 키', () => {
  it.each<[string, readonly unknown[], readonly unknown[]]>([
    ['chats.conversations', chatsKeys.conversations(), ['chats', 'conversations']],
    ['chats.messages', chatsKeys.messages('c1'), ['chats', 'messages', 'c1']],
    ['home.dashboard(오늘)', homeKeys.dashboard(), ['home', 'dashboard', 'today']],
    ['home.dashboard(날짜)', homeKeys.dashboard('2026-10-06'), ['home', 'dashboard', '2026-10-06']],
    ['orders.list', ordersKeys.list({ status: 'PAID' }), ['orders', 'list', { status: 'PAID' }]],
    ['orders.detail', ordersKeys.detail('1'), ['orders', 'detail', '1']],
    [
      'products.list',
      productsKeys.list({ isActive: true }),
      ['products', 'list', { isActive: true }],
    ],
    ['products.detail', productsKeys.detail('1'), ['products', 'detail', '1']],
    ['products.categories', productsKeys.categories(), ['products', 'categories']],
    ['products.tagSearch', productsKeys.tagSearch('케이크'), ['products', 'tags', '케이크']],
    ['push.permission', pushKeys.permission(), ['push', 'permission']],
    ['push.token', pushKeys.token(), ['push', 'token']],
    [
      'reviews.list',
      reviewsKeys.list({ photoOnly: true }),
      ['reviews', 'list', { photoOnly: true }],
    ],
    ['reviews.detail', reviewsKeys.detail('1'), ['reviews', 'detail', '1']],
    ['reviews.comments', reviewsKeys.comments('1'), ['reviews', 'comments', '1']],
    ['settings.me', settingsKeys.me(), ['settings', 'me']],
    ['settings.pushPermission', settingsKeys.pushPermission(), ['settings', 'pushPermission']],
    ['store.me', storeKeys.me(), ['store', 'me']],
    ['store.myStore', storeKeys.myStore(), ['store', 'myStore']],
    ['store.businessHours', storeKeys.businessHours(), ['store', 'businessHours']],
    ['store.specialClosures', storeKeys.specialClosures(), ['store', 'specialClosures']],
    [
      'store.dailyCapacities',
      storeKeys.dailyCapacities('2026-10'),
      ['store', 'dailyCapacities', '2026-10'],
    ],
    ['store.faqTopics', storeKeys.faqTopics(), ['store', 'faqTopics']],
    ['store.auditLogs(전체)', storeKeys.auditLogs(), ['store', 'auditLogs', 'all']],
    ['store.auditLogs(대상)', storeKeys.auditLogs('PRODUCT'), ['store', 'auditLogs', 'PRODUCT']],
    ['store.preview', storeKeys.preview('s1'), ['store', 'preview', 's1']],
    [
      'uploads.presign',
      uploadsKeys.presign('PRODUCT_IMAGE'),
      ['uploads', 'presign', 'PRODUCT_IMAGE'],
    ],
  ])('%s', (_, actual, expected) => {
    expect(actual).toEqual(expected);
  });
});
