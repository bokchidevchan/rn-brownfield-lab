import React from 'react';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { useFlow } from '@stackflow/react';

/**
 * 스택 세 번째 화면. 깊이가 쌓였을 때 뒤로가기가 어떻게 도는지 보려고 둡니다.
 */
export default function ReviewList({ params }) {
  const { pop } = useFlow();

  return (
    <AppScreen appBar={{ title: '리뷰' }}>
      <div style={s.body}>
        <div style={s.badge}>스택 깊이 3</div>
        <p style={s.note}>
          {params.productId} 의 리뷰 화면입니다. 여기서 안드로이드 백 버튼을 누르면
          어떻게 되는지가 이 실험의 관심사입니다. 브라우저에서는 상세로 돌아가고,
          네이티브 웹뷰에서는 앱이 백 버튼을 웹뷰에 넘겨 주지 않으면 화면 전체가 닫힙니다.
        </p>
        {['배송이 빨라요', '사이즈가 정확합니다', '재구매 의사 있습니다'].map(t => (
          <div key={t} style={s.review}>{t}</div>
        ))}
        <button style={s.buttonGhost} onClick={() => pop()}>
          뒤로 (pop)
        </button>
      </div>
    </AppScreen>
  );
}

const s = {
  body: { padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  badge: {
    alignSelf: 'flex-start', background: '#2f9e44', color: '#fff',
    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 10,
  },
  note: { fontSize: 13, lineHeight: 1.7, color: '#6b6b74' },
  review: {
    padding: 14, borderRadius: 10, background: '#f8f9fa', fontSize: 14, color: '#111114',
  },
  buttonGhost: {
    marginTop: 8, padding: '12px 0', borderRadius: 10, border: '1px solid #dee2e6',
    background: '#fff', color: '#111114', fontSize: 15, fontWeight: 600,
  },
};
