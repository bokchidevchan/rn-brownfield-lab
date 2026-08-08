import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';

import {Button, Field, Section, styles} from '../components/ui';
import {markMount} from '../instanceCounter';
import {
  addThemeChangeListener,
  finishWithResult,
  getHostInfo,
} from '../native/HostBridge';

/**
 * 네이티브 목록 화면에서 상품을 눌렀을 때 뜨는 RN 상세 화면.
 *
 * props 로 들어오는 값은 전부 네이티브가 넘긴 initialProps 입니다.
 * initialProps 는 화면을 띄우는 그 순간 한 번만 전달됩니다.
 * 화면이 떠 있는 동안 값이 바뀌어야 한다면 이벤트나 네이티브 모듈 호출로 받아야 합니다.
 */
export default function ProductDetailScreen(props) {
  const {productId = '(없음)', entryPoint = '(없음)', launchedAtMs = 0} = props;

  // 첫 렌더에서 한 번만 계산해서, 이 화면이 몇 번째 마운트인지 기록합니다.
  const instance = useMemo(() => markMount(), []);
  const [hostInfo, setHostInfo] = useState(null);
  const [themeEvents, setThemeEvents] = useState([]);

  useEffect(() => {
    const subscription = addThemeChangeListener(event => {
      setThemeEvents(prev => [event.theme, ...prev].slice(0, 5));
    });
    // 인스턴스를 공유하는 구조에서는 이 remove 가 빠지면 화면을 드나들 때마다
    // 리스너가 쌓여서 같은 이벤트를 여러 번 처리하게 됩니다.
    return () => subscription.remove();
  }, []);

  const timeToFirstRenderMs =
    launchedAtMs > 0 ? Date.now() - launchedAtMs : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.badge}>React Native</Text>
      <Text style={styles.title}>상품 상세</Text>

      <Section title="네이티브가 넘긴 INITIALPROPS">
        <Field label="productId" value={productId} />
        <Field label="entryPoint" value={entryPoint} />
        <Text style={styles.note}>
          네이티브 Intent extras(android) / RCTRootView initialProperties(ios) 로 들어온
          값입니다. 직렬화 가능한 타입만 넘어갑니다.
        </Text>
      </Section>

      <Section title="RN 인스턴스">
        <Field label="이 컨텍스트에서 마운트된 횟수" value={instance.mountCount} />
        <Field label="JS 컨텍스트 나이" value={`${instance.contextAgeMs}ms`} />
        {timeToFirstRenderMs !== null && (
          <Field label="네이티브 호출 → 첫 렌더" value={`${timeToFirstRenderMs}ms`} />
        )}
        <Text style={styles.note}>
          뒤로 갔다가 다시 들어왔을 때 마운트 횟수가 계속 올라가면 인스턴스를 재사용하는
          것이고, 1 로 돌아가면 매번 새로 만드는 것입니다. 첫 진입과 두 번째 진입의
          "첫 렌더까지" 값을 비교하면 인스턴스 생성 비용이 그대로 보입니다.
        </Text>
      </Section>

      <Section title="네이티브 → RN 이벤트">
        {themeEvents.length === 0 ? (
          <Text style={styles.note}>
            아직 받은 이벤트가 없습니다. 네이티브 화면의 "테마 바꾸기" 버튼을 누르면
            여기에 쌓입니다.
          </Text>
        ) : (
          themeEvents.map((theme, index) => (
            <Field key={`${theme}-${index}`} label={`#${themeEvents.length - index}`} value={theme} />
          ))
        )}
      </Section>

      <Section title="RN → 네이티브 호출">
        {hostInfo && (
          <View>
            <Field label="appVersion" value={hostInfo.appVersion} />
            <Field label="platform" value={hostInfo.platform} />
            <Field label="isDebug" value={hostInfo.isDebug} />
          </View>
        )}
        <Button
          title="호스트 정보 가져오기 (Promise)"
          onPress={() => {
            getHostInfo()
              .then(setHostInfo)
              .catch(error => setHostInfo({appVersion: error.message, platform: '-', isDebug: '-'}));
          }}
        />
        <Button
          tone="primary"
          title="장바구니에 담고 닫기"
          onPress={() => finishWithResult({productId, action: 'ADD_TO_CART'})}
        />
      </Section>
    </ScrollView>
  );
}
