import React, {useEffect, useState} from 'react';
import {ScrollView, Text} from 'react-native';

import {Button, Field, Section, styles} from '../components/ui';
import {markMount} from '../instanceCounter';
import {
  addThemeChangeListener,
  finishWithResult,
  getHostInfo,
} from '../native/SdkBridge';

/**
 * SDK 가 제공하는 상품 상세 화면.
 *
 * props 로 들어오는 값의 출처가 01 번과 다릅니다.
 * 01 번은 호스트 앱이 Intent 에 직접 담았고, 여기서는 소비 앱이
 * RnSdk.openProductDetail(productId) 를 부르면 SDK 가 알아서 initialProps 로 바꿉니다.
 * 소비 앱은 initialProps 라는 개념을 몰라도 됩니다.
 */
export default function ProductDetailScreen(props) {
  const {productId = '(없음)', launchedAtMs = 0} = props;

  const [firstRender] = useState(() => {
    const {mountCount, contextAgeMs} = markMount();
    return {
      mountCount,
      contextAgeMs,
      timeToFirstRenderMs:
        launchedAtMs > 0 ? Math.round(Date.now() - launchedAtMs) : null,
    };
  });

  const [hostInfo, setHostInfo] = useState(null);
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const subscription = addThemeChangeListener(event => setTheme(event.theme));
    return () => subscription.remove();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.badge}>RN SDK</Text>
      <Text style={styles.title}>상품 상세</Text>

      <Section title="SDK 가 넘긴 값">
        <Field label="productId" value={productId} />
        <Text style={styles.note}>
          소비 앱은 RnSdk.openProductDetail(productId) 만 불렀습니다. moduleName 도
          initialProps 도 SDK 안에서 처리됩니다.
        </Text>
      </Section>

      <Section title="RN 인스턴스">
        <Field label="이 컨텍스트에서 마운트된 횟수" value={firstRender.mountCount} />
        <Field label="JS 컨텍스트 나이" value={`${firstRender.contextAgeMs}ms`} />
        {firstRender.timeToFirstRenderMs !== null && (
          <Field
            label="SDK 호출 → 첫 렌더"
            value={`${firstRender.timeToFirstRenderMs}ms`}
          />
        )}
        <Text style={styles.note}>
          인스턴스는 SDK 가 들고 있습니다. 소비 앱의 Application 클래스는 RN 을 전혀
          모릅니다. 01 번에서 ReactApplication 을 구현해야 했던 부분이 사라졌습니다.
        </Text>
      </Section>

      <Section title="소비 앱 정보">
        {hostInfo && (
          <>
            <Field label="appName" value={hostInfo.appName} />
            <Field label="appVersion" value={hostInfo.appVersion} />
            <Field label="platform" value={hostInfo.platform} />
          </>
        )}
        <Button
          title="소비 앱 정보 가져오기"
          onPress={() => {
            getHostInfo()
              .then(setHostInfo)
              .catch(e =>
                setHostInfo({appName: e.message, appVersion: '-', platform: '-'}),
              );
          }}
        />
        <Text style={styles.note}>
          이 값은 소비 앱이 RnSdk.initialize() 에서 넘긴 것입니다. SDK 는 어떤 앱에
          붙었는지 그때 처음 알게 됩니다.
        </Text>
      </Section>

      <Section title="테마 이벤트">
        <Field label="현재 테마" value={theme ?? '(아직 못 받음)'} />
      </Section>

      <Section title="닫기">
        <Button
          tone="primary"
          title="장바구니에 담고 닫기"
          onPress={() => finishWithResult({productId, action: 'ADD_TO_CART'})}
        />
        <Text style={styles.note}>
          결과는 SDK 가 소비 앱이 등록한 리스너로 전달합니다. RN 화면은 소비 앱이
          그 결과로 무엇을 하는지 모릅니다.
        </Text>
      </Section>
    </ScrollView>
  );
}
