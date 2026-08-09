import React from 'react';
import { createRoot } from 'react-dom/client';

import { ListBody, DetailBody, ReviewBody, s } from './shared/screens';

/**
 * 비교군 1. 화면마다 URL 이 따로 있고 이동할 때 문서를 다시 받습니다.
 *
 * 서버 렌더링을 쓰는 웹 서비스를 웹뷰에 그대로 얹으면 이 모양이 됩니다.
 * 03 번에서 "화면을 오갈 때마다 서버를 다녀온다"고 적은 게 이 경우입니다.
 * 서버 로그(/__log)를 보면 이동할 때마다 요청이 쌓이는 게 보입니다.
 */
const path = window.location.pathname;
const params = new URLSearchParams(window.location.search);
const productId = params.get('productId') ?? 'SKU-1000';

function go(url) {
  // 문서 이동입니다. 여기서 흰 깜빡임과 네트워크 요청이 생깁니다.
  window.location.href = url;
}

function Screen() {
  if (path.endsWith('/reviews')) {
    return (
      <>
        <div style={s.plainHeader}>리뷰</div>
        <ReviewBody
          productId={productId}
          onBack={() => go(`/plain-mpa/detail?productId=${productId}`)}
        />
      </>
    );
  }

  if (path.endsWith('/detail')) {
    return (
      <>
        <div style={s.plainHeader}>상품 상세</div>
        <DetailBody
          productId={productId}
          badge="WEB · plain MPA"
          badgeColor="#c92a2a"
          rows={[
            ['화면 진입 방식', '문서 로드'],
            ['이전 화면', '버려짐'],
            ['전환 애니메이션', '없음 (흰 깜빡임)'],
          ]}
          onReviews={() => go(`/plain-mpa/reviews?productId=${productId}`)}
          onBack={() => go('/plain-mpa/')}
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
            <strong>plain MPA 입니다.</strong> 항목을 누르면 다른 URL 로 문서를
            다시 받습니다. 서버 로그에 요청이 쌓이고, 돌아오면 스크롤도 처음으로 갑니다.
          </>
        }
        onOpen={id => go(`/plain-mpa/detail?productId=${id}`)}
      />
    </>
  );
}

createRoot(document.getElementById('root')).render(<Screen />);
