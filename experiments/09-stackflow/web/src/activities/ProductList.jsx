import React from 'react';
import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useFlow } from '@stackflow/react';

import { ListBody } from '../shared/screens';

/**
 * 목록 화면. 본문은 세 비교군이 공용으로 씁니다.
 *
 * Stackflow 는 이전 화면을 DOM 에 남겨 둔 채 위에 쌓기 때문에,
 * 상세로 들어갔다 돌아와도 스크롤 위치가 그대로입니다.
 * plain SPA 판은 unmount 되어 0 으로 돌아갑니다. 그 차이를 보는 화면입니다.
 */
export default function ProductList() {
  const { push } = useFlow();

  return (
    <AppScreen appBar={{ title: '상품 목록' }}>
      <ListBody
        notice={
          <>
            <strong>Stackflow 입니다.</strong> 항목을 누르면 문서를 다시 받지 않고
            스택에 화면을 쌓습니다. 스크롤을 내린 뒤 들어갔다 나와 보세요.
          </>
        }
        onOpen={productId => push('ProductDetail', { productId })}
      />
    </AppScreen>
  );
}
