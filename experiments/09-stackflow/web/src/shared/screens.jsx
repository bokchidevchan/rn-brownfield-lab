import React, { useEffect, useRef, useState } from 'react';

/**
 * 세 비교군이 똑같은 화면을 쓰도록 공용으로 뺐습니다.
 *
 * 비교가 공정하려면 화면 내용은 같아야 하고 다른 것은 화면을 옮기는 방식뿐이어야
 * 합니다. Stackflow 판만 예쁘게 만들어 놓고 빠르다고 하면 의미가 없습니다.
 */

export const PRODUCTS = Array.from({ length: 40 }, (_, i) => ({
  id: `SKU-${1000 + i}`,
  name: `상품 ${i + 1}`,
  price: (12000 + i * 1300).toLocaleString(),
}));

/** 목록 본문. onOpen(productId) 만 바깥에서 주입받습니다. */
export function ListBody({ onOpen, notice }) {
  const [scrollY, setScrollY] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onScroll = () => setScrollY(Math.round(el.scrollTop));
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} style={s.scroll}>
      <div style={s.notice}>{notice}</div>
      <div style={s.meta}>현재 스크롤 {scrollY}px</div>
      {PRODUCTS.map(p => (
        <button key={p.id} style={s.row} onClick={() => onOpen(p.id)}>
          <span style={s.name}>{p.name}</span>
          <span style={s.price}>{p.price}원</span>
        </button>
      ))}
    </div>
  );
}

export function DetailBody({ productId, badge, badgeColor, rows, onReviews, onBack }) {
  return (
    <div style={s.body}>
      <div style={{ ...s.badge, background: badgeColor }}>{badge}</div>
      <h2 style={s.title}>{productId}</h2>
      {rows.map(([label, value]) => (
        <div key={label} style={s.detailRow}>
          <span style={s.rowLabel}>{label}</span>
          <span style={s.rowValue}>{value}</span>
        </div>
      ))}
      <button style={s.button} onClick={onReviews}>리뷰 보기 (한 단계 더)</button>
      <button style={s.buttonGhost} onClick={onBack}>뒤로</button>
    </div>
  );
}

export function ReviewBody({ productId, onBack }) {
  return (
    <div style={s.body}>
      <div style={{ ...s.badge, background: '#2f9e44' }}>스택 깊이 3</div>
      <p style={s.note}>{productId} 의 리뷰입니다.</p>
      {['배송이 빨라요', '사이즈가 정확합니다', '재구매 의사 있습니다'].map(t => (
        <div key={t} style={s.review}>{t}</div>
      ))}
      <button style={s.buttonGhost} onClick={onBack}>뒤로</button>
    </div>
  );
}

export const s = {
  scroll: { height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  notice: {
    margin: 16, padding: 14, borderRadius: 12, background: '#eef4ff',
    fontSize: 13, lineHeight: 1.6, color: '#1f3b6f',
  },
  meta: { padding: '0 16px 8px', fontSize: 12, color: '#868e96' },
  row: {
    display: 'flex', width: '100%', alignItems: 'center',
    justifyContent: 'space-between', padding: '16px 20px',
    border: 'none', borderBottom: '1px solid #f1f3f5',
    background: '#fff', fontSize: 15, textAlign: 'left',
  },
  name: { color: '#111114', fontWeight: 500 },
  price: { color: '#6b6b74' },
  body: { padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  badge: {
    alignSelf: 'flex-start', color: '#fff',
    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 10,
  },
  title: { fontSize: 22, margin: 0, color: '#111114' },
  detailRow: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14, color: '#6b6b74' },
  rowValue: { fontSize: 14, fontWeight: 600, color: '#111114' },
  note: { fontSize: 13, lineHeight: 1.7, color: '#6b6b74' },
  review: { padding: 14, borderRadius: 10, background: '#f8f9fa', fontSize: 14 },
  button: {
    marginTop: 8, padding: '12px 0', borderRadius: 10, border: 'none',
    background: '#1f6feb', color: '#fff', fontSize: 15, fontWeight: 600,
  },
  buttonGhost: {
    padding: '12px 0', borderRadius: 10, border: '1px solid #dee2e6',
    background: '#fff', color: '#111114', fontSize: 15, fontWeight: 600,
  },
  plainHeader: {
    height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderBottom: '1px solid #f1f3f5', fontSize: 17, fontWeight: 600,
  },
};
