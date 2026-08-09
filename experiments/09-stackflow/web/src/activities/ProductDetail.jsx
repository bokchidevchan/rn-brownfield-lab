import React from 'react';
import { AppScreen } from '@stackflow/plugin-basic-ui';

import { useFlow } from '@stackflow/react';

/**
 * 상세 화면. push 로 올라오고, 뒤로가기나 스와이프백으로 내려갑니다.
 *
 * cupertino 테마에서는 화면 왼쪽 가장자리를 밀면 이전 화면이 따라 나옵니다.
 * 웹에서 그 제스처를 구현한 것이라, 앱의 네이티브 스와이프백과 다른 구현입니다.
 * 겹쳐 쓰면 둘이 동시에 반응하는 문제가 생깁니다. README 에 적었습니다.
 */
export default function ProductDetail({ params }) {
  const { push, pop } = useFlow();

  return (
    <AppScreen appBar={{ title: '상품 상세' }}>
      <div style={s.body}>
        <div style={s.badge}>WEB · Stackflow</div>
        <h2 style={s.title}>{params.productId}</h2>

        <Row label="화면 진입 방식" value="스택 push (문서 로드 아님)" />
        <Row label="이전 화면" value="DOM 에 살아 있음" />
        <Row label="전환 애니메이션" value="cupertino 350ms" />

        <p style={s.note}>
          이 화면이 뜰 때 네트워크 요청이 없습니다. 개발자 도구 네트워크 탭이나
          서버 로그로 확인할 수 있습니다. 같은 문서 안에서 컴포넌트가 바뀐 것뿐입니다.
        </p>

        <button style={s.button} onClick={() => push('ReviewList', { productId: params.productId })}>
          리뷰 보기 (한 단계 더 쌓기)
        </button>
        <button style={s.buttonGhost} onClick={() => pop()}>
          뒤로 (pop)
        </button>
      </div>
    </AppScreen>
  );
}

function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowValue}>{value}</span>
    </div>
  );
}

const s = {
  body: { padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  badge: {
    alignSelf: 'flex-start', background: '#111114', color: '#fff',
    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 10,
  },
  title: { fontSize: 22, margin: 0, color: '#111114' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14, color: '#6b6b74' },
  rowValue: { fontSize: 14, fontWeight: 600, color: '#111114' },
  note: { fontSize: 12, lineHeight: 1.7, color: '#6b6b74' },
  button: {
    marginTop: 8, padding: '12px 0', borderRadius: 10, border: 'none',
    background: '#1f6feb', color: '#fff', fontSize: 15, fontWeight: 600,
  },
  buttonGhost: {
    padding: '12px 0', borderRadius: 10, border: '1px solid #dee2e6',
    background: '#fff', color: '#111114', fontSize: 15, fontWeight: 600,
  },
};
