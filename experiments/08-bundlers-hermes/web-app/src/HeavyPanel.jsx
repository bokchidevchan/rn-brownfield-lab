import React from 'react';
// 이 파일에서만 쓰는 의존입니다. 코드 스플리팅이 제대로 되면
// chunk 쪽에만 들어가고 초기 번들에는 없어야 합니다.
import { groupBy } from 'lodash-es';

const ITEMS = [
  { team: 'android', name: '결제' },
  { team: 'android', name: '홈' },
  { team: 'ios', name: '검색' },
  { team: 'web', name: '이벤트' },
];

export default function HeavyPanel() {
  const grouped = groupBy(ITEMS, 'team');
  return (
    <section>
      <h2>동적으로 로드된 패널</h2>
      {Object.entries(grouped).map(([team, items]) => (
        <p key={team}>
          {team}: {items.map(i => i.name).join(', ')}
        </p>
      ))}
    </section>
  );
}
