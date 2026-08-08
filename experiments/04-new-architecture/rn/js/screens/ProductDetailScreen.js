import React, {useEffect, useState} from 'react';
import {InteractionManager, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {getArchInfo, reportFirstPaint} from '../native/Bench';

/**
 * 첫 번째 서피스. 이 파일은 구아키텍처와 신아키텍처에서 한 글자도 다르지 않습니다.
 *
 * 아키텍처 전환에서 바뀌는 것은 네이티브 진입 코드이고,
 * 화면 코드는 그대로라는 것을 보여주는 것도 이 실험의 목적 중 하나입니다.
 */

// JS 컨텍스트가 살아 있는 동안 유지됩니다.
// 서피스 여러 개가 같은 JS 전역을 공유하는지 확인하는 데 씁니다.
export const shared = {mounts: 0};

export default function ProductDetailScreen(props) {
  const {productId = '(없음)'} = props;
  const [state] = useState(() => {
    shared.mounts += 1;
    return {order: shared.mounts};
  });

  const [ttfp, setTtfp] = useState(null);
  const [arch, setArch] = useState(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reportFirstPaint('detail').then(ms => setTtfp(Math.round(ms)));
        });
      });
    });
    getArchInfo().then(setArch);
    return () => task.cancel();
  }, []);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.badge}>SURFACE 1</Text>
      <Text style={s.title}>상품 상세</Text>

      <View style={s.section}>
        <Text style={s.h2}>아키텍처</Text>
        <Row label="newArchEnabled" value={arch?.newArch ?? '...'} />
        <Row label="진입 경로" value={arch?.entryPath ?? '...'} />
        <Row label="렌더러" value={arch?.renderer ?? '...'} />
        <Text style={s.note}>
          이 값은 네이티브가 알려 준 것입니다. JS 코드는 두 아키텍처에서 같습니다.
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>측정</Text>
        <Row label="탭 → 첫 페인트" value={ttfp === null ? '재는 중' : `${ttfp}ms`} />
        <Row label="이 JS 컨텍스트의 몇 번째 마운트인가" value={String(state.order)} />
        <Row label="productId" value={productId} />
      </View>

      <View style={s.section}>
        <Text style={s.h2}>서피스 공유</Text>
        <Text style={s.note}>
          리뷰 화면을 같이 띄우면 저 마운트 번호가 이어집니다. 두 서피스가 같은 JS
          런타임을 쓴다는 뜻입니다. 편한 만큼 화면 사이 격리가 없다는 뜻이기도 합니다.
        </Text>
      </View>
    </ScrollView>
  );
}

function Row({label, value}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{String(value)}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f5f5f7'},
  content: {padding: 20, gap: 16},
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#1f6feb', color: '#fff',
    fontSize: 12, fontWeight: '600', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  title: {fontSize: 24, fontWeight: '700', color: '#111114'},
  section: {backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10},
  h2: {fontSize: 13, fontWeight: '700', color: '#6b6b74', letterSpacing: 0.4},
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  rowLabel: {fontSize: 14, color: '#6b6b74'},
  rowValue: {flexShrink: 1, fontSize: 14, fontWeight: '600', color: '#111114', textAlign: 'right'},
  note: {fontSize: 12, lineHeight: 18, color: '#6b6b74'},
});

export {Row, Pressable};
