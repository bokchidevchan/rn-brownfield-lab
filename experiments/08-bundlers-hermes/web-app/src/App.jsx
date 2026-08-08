import React, { useMemo, useState } from 'react';
// 일부러 lodash-es 에서 함수 하나만 가져옵니다.
// 트리 셰이킹이 되면 debounce 와 그 의존만 번들에 들어가고,
// 안 되면 lodash 전체(수백 KB)가 들어갑니다. 결과에서 확인합니다.
import { debounce } from 'lodash-es';

export default function App() {
  const [query, setQuery] = useState('');
  const [committed, setCommitted] = useState('');

  const commit = useMemo(() => debounce(setCommitted, 300), []);

  return (
    <main>
      <h1 data-testid="title">번들러 비교 데모</h1>
      <p>
        입력이 멈추고 300ms 뒤에 반영됩니다 (lodash-es debounce).
      </p>
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          commit(e.target.value);
        }}
        placeholder="입력해 보세요"
      />
      <p data-testid="committed">반영된 값: {committed}</p>
      <LazySection />
    </main>
  );
}

/**
 * 동적 import. 코드 스플리팅이 되는 번들러라면 이 부분이 별도 청크로
 * 나와야 합니다. webpack 과 esbuild 모두 지원하지만 산출물 모양이 다릅니다.
 */
function LazySection() {
  const [Heavy, setHeavy] = useState(null);

  if (Heavy) {
    return <Heavy.default />;
  }
  return (
    <button onClick={() => import('./HeavyPanel').then(setHeavy)}>
      무거운 패널 열기 (동적 import)
    </button>
  );
}
