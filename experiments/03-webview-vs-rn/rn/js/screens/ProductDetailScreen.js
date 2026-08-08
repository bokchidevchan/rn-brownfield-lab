import React, {useEffect, useState} from 'react';
import {InteractionManager, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {finishWithResult, getHostInfo, reportFirstPaint} from '../native/Bench';

/**
 * web/public/index.html 과 같은 내용, 같은 구조입니다.
 * 섹션 4개, 행 6개, 버튼 2개로 맞췄습니다. 그래야 렌더 비용 비교가 성립합니다.
 */

// JS 컨텍스트가 살아 있는 동안 유지됩니다. 웹뷰의 sessionStorage 카운터와 짝입니다.
let mountCount = 0;

export default function ProductDetailScreen(props) {
  const {productId = '(없음)', entryPoint = '(없음)'} = props;

  const [state] = useState(() => {
    mountCount += 1;
    return {mountCount};
  });

  const [hostInfo, setHostInfo] = useState(null);
  const [rtt, setRtt] = useState(null);
  const [ttfp, setTtfp] = useState(null);

  useEffect(() => {
    // 웹뷰의 double rAF 와 같은 의도입니다.
    // "이 프레임이 화면에 나간 뒤"에 알려야 두 방식의 정의가 같아집니다.
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reportFirstPaint().then(ms => setTtfp(Math.round(ms)));
        });
      });
    });
    return () => task.cancel();
  }, []);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.badge}>REACT NATIVE</Text>
      <Text style={s.title}>상품 상세</Text>

      <View style={s.section}>
        <Text style={s.h2}>네이티브가 넘긴 값</Text>
        <Row label="productId" value={productId} />
        <Row label="entryPoint" value={entryPoint} />
        <Text style={s.note}>
          initialProps 로 들어옵니다. 웹뷰는 이 자리를 쿼리스트링으로 대신해서
          값이 전부 문자열이 되고 길이 제한도 생깁니다.
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>런타임</Text>
        <Row label="탭 → 첫 페인트" value={ttfp === null ? '재는 중' : `${ttfp}ms`} />
        <Row label="이 컨텍스트에서 마운트된 횟수" value={String(state.mountCount)} />
        <Text style={s.note}>
          웹뷰와 갈리는 지점입니다. RN 은 화면을 닫아도 JS 컨텍스트가 남아서 이 값이
          계속 올라갑니다. 웹뷰는 인스턴스를 재사용하지 않는 한 항상 1 입니다.
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>네이티브 호출</Text>
        <Row label="appVersion" value={hostInfo?.appVersion ?? '-'} />
        <Row label="왕복 시간" value={rtt === null ? '-' : `${rtt}ms`} />
        <Button
          title="호스트 정보 가져오기"
          onPress={async () => {
            const t0 = Date.now();
            const info = await getHostInfo();
            setHostInfo(info);
            setRtt(Date.now() - t0);
          }}
        />
        <Text style={s.note}>
          await 한 줄입니다. 웹뷰 쪽 같은 기능은 요청 ID, 콜백 테이블, 타임아웃까지
          직접 만들어야 합니다.
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>닫기</Text>
        <Button
          primary
          title="장바구니에 담고 닫기"
          onPress={() => finishWithResult({productId, action: 'ADD_TO_CART'})}
        />
      </View>
    </ScrollView>
  );
}

function Row({label, value}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function Button({title, onPress, primary}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [s.button, primary && s.buttonPrimary, pressed && {opacity: 0.6}]}>
      <Text style={[s.buttonText, primary && s.buttonTextPrimary]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
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
  button: {
    borderRadius: 10, borderWidth: 1, borderColor: '#d0d0d8',
    paddingVertical: 12, alignItems: 'center',
  },
  buttonPrimary: {backgroundColor: '#1f6feb', borderColor: '#1f6feb'},
  buttonText: {fontSize: 15, fontWeight: '600', color: '#111114'},
  buttonTextPrimary: {color: '#fff'},
});
