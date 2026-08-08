import React, {useEffect, useState} from 'react';
import {InteractionManager, ScrollView, Text, View} from 'react-native';

import {reportFirstPaint} from '../native/Bench';
import {Row, s, shared} from './ProductDetailScreen';

/**
 * 두 번째 서피스.
 *
 * 이 화면이 존재하는 이유는 두 가지를 재기 위해서입니다.
 *
 * 1. 엔진이 이미 떠 있을 때 서피스를 하나 더 만드는 비용
 * 2. 두 서피스가 같은 JS 전역을 공유하는지
 *
 * shared.mounts 를 상세 화면과 같이 쓰고 있어서, 이 화면의 번호가 2 로 나오면
 * 같은 런타임입니다.
 */
export default function ReviewScreen() {
  const [state] = useState(() => {
    shared.mounts += 1;
    return {order: shared.mounts};
  });

  const [ttfp, setTtfp] = useState(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reportFirstPaint('review').then(ms => setTtfp(Math.round(ms)));
        });
      });
    });
    return () => task.cancel();
  }, []);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={[s.badge, {backgroundColor: '#e8590c'}]}>SURFACE 2</Text>
      <Text style={s.title}>리뷰</Text>

      <View style={s.section}>
        <Text style={s.h2}>측정</Text>
        <Row label="탭 → 첫 페인트" value={ttfp === null ? '재는 중' : `${ttfp}ms`} />
        <Row label="이 JS 컨텍스트의 몇 번째 마운트인가" value={String(state.order)} />
        <Text style={s.note}>
          번호가 2 이상이면 상세 화면과 같은 JS 런타임입니다. 번들을 다시 파싱하지
          않았다는 뜻이고, 그래서 두 번째 서피스가 쌉니다.
        </Text>
      </View>
    </ScrollView>
  );
}
