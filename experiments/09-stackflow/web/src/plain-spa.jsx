import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ListBody, DetailBody, ReviewBody, s } from './shared/screens';

/**
 * 비교군 2. 흔히 쓰는 방식입니다. React 상태로 화면을 갈아 끼웁니다.
 *
 * 문서를 다시 받지 않으니 네트워크는 안 탑니다. 거기까지는 Stackflow 와 같습니다.
 * 다른 것은 이겁니다.
 *
 *   화면을 바꾸면 이전 화면이 unmount 됩니다. 스크롤 위치와 입력값이 사라집니다.
 *   전환 애니메이션이 없습니다. 툭 바뀝니다.
 *   스와이프백이 없습니다.
 *   브라우저 히스토리와 연결이 없어서 뒤로가기를 직접 짜야 합니다.
 *
 * Stackflow 가 해 주는 게 정확히 이 네 가지입니다.
 */
function PlainSpa() {
  const [screen, setScreen] = useState({ name: 'list' });

  if (screen.name === 'detail') {
    return (
      <>
        <div style={s.plainHeader}>상품 상세</div>
        <DetailBody
          productId={screen.productId}
          badge="WEB · plain SPA"
          badgeColor="#868e96"
          rows={[
            ['화면 진입 방식', 'setState (문서 로드 아님)'],
            ['이전 화면', 'unmount 됨'],
            ['전환 애니메이션', '없음'],
          ]}
          onReviews={() => setScreen({ name: 'reviews', productId: screen.productId })}
          onBack={() => setScreen({ name: 'list' })}
        />
      </>
    );
  }

  if (screen.name === 'reviews') {
    return (
      <>
        <div style={s.plainHeader}>리뷰</div>
        <ReviewBody
          productId={screen.productId}
          onBack={() => setScreen({ name: 'detail', productId: screen.productId })}
        />
      </>
    );
  }

  return (
    <>
      <div style={s.plainHeader}>상품 목록</div>
      <ListBody
        notice={
          <>
            <strong>plain SPA 입니다.</strong> 상태만 바꿔서 화면을 그립니다.
            스크롤을 내린 뒤 상세로 갔다가 돌아와 보세요. 스크롤이 0 으로 돌아갑니다.
          </>
        }
        onOpen={productId => setScreen({ name: 'detail', productId })}
      />
    </>
  );
}

createRoot(document.getElementById('root')).render(<PlainSpa />);
