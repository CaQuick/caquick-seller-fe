import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { messageFor } from '@/shared/api';
import { showToast } from '@/shared/ui';

import { deleteProduct, setProductActive } from '../api/browse';
import { productsKeys } from '../api/queryKeys';
import {
  type ProductListData,
  removeFromList,
  restoreActiveInList,
  setActiveInList,
} from './browse';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

interface ActiveVars {
  productId: string;
  isActive: boolean;
}

/**
 * 노출 스위치는 낙관적으로 반영한다: 목록·상세 캐시를 먼저 바꾸고 실패하면 이 상품만 스냅샷 값으로 되돌린다.
 * 성공 뒤 목록은 stale 표시만 한다 — 보고 있는 탭에서 행이 바로 사라지지 않아 되돌려 켤 수 있다
 */
export function useSetProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, isActive }: ActiveVars) => setProductActive(productId, isActive),
    onMutate: async ({ productId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: productsKeys.lists() });
      await queryClient.cancelQueries({ queryKey: productsKeys.detail(productId), exact: true });
      const lists = queryClient.getQueriesData<ProductListData>({
        queryKey: productsKeys.lists(),
      });
      const detail = queryClient.getQueryData(productsKeys.detail(productId));
      queryClient.setQueriesData<ProductListData>({ queryKey: productsKeys.lists() }, (data) =>
        setActiveInList(data, productId, isActive),
      );
      queryClient.setQueryData<{ isActive: boolean }>(productsKeys.detail(productId), (data) =>
        data ? { ...data, isActive } : data,
      );
      return { lists, detail };
    },
    onError: (error, { productId }, context) => {
      // 이 상품만 되돌린다 — 목록 통째 복원은 응답 전에 바꾼 다른 상품의 스위치까지 덮는다
      context?.lists.forEach(([key, snapshot]) =>
        queryClient.setQueryData<ProductListData>(key, (current) =>
          restoreActiveInList(current, snapshot, productId),
        ),
      );
      if (context?.detail) queryClient.setQueryData(productsKeys.detail(productId), context.detail);
      showToast.error(messageFor(error));
    },
    onSettled: (_data, _error, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists(), refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(productId) });
    },
  });
}

/** 상세 캐시는 건드리지 않는다 — 화면이 아직 붙어 있어 다시 불러오면 NOT_FOUND가 난다 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_data, productId) => {
      queryClient.setQueriesData<ProductListData>({ queryKey: productsKeys.lists() }, (data) =>
        removeFromList(data, productId),
      );
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}
