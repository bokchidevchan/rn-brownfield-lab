import React, {useEffect, useState} from 'react';
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

  /**
   * 첫 렌더에서 한 번만 재고 그대로 붙잡아 둡니다.
   *
   * useState 의 초기화 함수는 정확히 한 번만 실행됩니다. 여기 있는 값을 렌더 본문에서
   * 계산하면 아래 버튼을 누를 때마다 다시 계산돼서, 측정값이 아니라
   * "화면을 연 지 얼마나 지났나"가 돼 버립니다.
   */
  const [firstRender] = useState(() => {
    const {mountCount, contextAgeMs} = markMount();
    return {
      mountCount,
      contextAgeMs,
      // iOS 는 Date().timeIntervalSince1970 * 1000 으로 넘겨서 소수점이 딸려 옵니다.
      // 안드로이드는 Long 이라 정수지만, 표시는 양쪽 같게 맞춥니다.
      timeToFirstRenderMs:
        launchedAtMs > 0 ? Math.round(Date.now() - launchedAtMs) : null,
    };
  });

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
        <Field label="이 컨텍스트에서 마운트된 횟수" value={firstRender.mountCount} />
        <Field label="JS 컨텍스트 나이" value={`${firstRender.contextAgeMs}ms`} />
        {firstRender.timeToFirstRenderMs !== null && (
          <Field
            label="네이티브 호출 → 첫 렌더"
            value={`${firstRender.timeToFirstRenderMs}ms`}
          />
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
            이 화면은 전체 화면으로만 열려서, 네이티브 버튼을 같이 누를 방법이 없습니다.
            그래서 여기는 계속 비어 있는 게 정상입니다. 이벤트가 도착하는 걸 보려면
            네이티브 첫 화면에서 "부분 삽입"을 여세요. 리스너 등록과 해제 코드는
            이 화면에도 똑같이 있습니다.
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
