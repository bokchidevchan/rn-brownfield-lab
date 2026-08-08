import React, {useEffect, useState} from 'react';
import {ScrollView, Text} from 'react-native';

import {Button, Field, Section, styles} from '../components/ui';
import {markMount} from '../instanceCounter';
import {addThemeChangeListener, close} from '../native/SdkBridge';

/**
 * 부분 삽입용 화면. 소비 앱은 RnSdk.createSettingsView(context) 로
 * 그냥 android.view.View 를 하나 받습니다.
 *
 * ReactRootView 라는 타입이 소비 앱 코드에 등장하지 않는 게 핵심입니다.
 * SDK 가 View 로 감춰서 돌려주기 때문에, 나중에 내부 구현을 Fabric 으로 바꿔도
 * 소비 앱은 재컴파일만 하면 됩니다.
 */
export default function SettingsScreen(props) {
  const {userTier = 'FREE'} = props;
  const [instance] = useState(() => markMount());
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const subscription = addThemeChangeListener(event => setTheme(event.theme));
    return () => subscription.remove();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.badge}>RN SDK</Text>
      <Text style={styles.title}>설정</Text>

      <Section title="상태">
        <Field label="userTier" value={userTier} />
        <Field label="이 컨텍스트에서 마운트된 횟수" value={instance.mountCount} />
        <Text style={styles.note}>
          상품 상세를 먼저 열었다가 이 화면에 들어왔을 때 카운터가 이어지면 SDK 가 RN
          인스턴스를 하나만 들고 있다는 뜻입니다.
        </Text>
      </Section>

      <Section title="테마 이벤트">
        <Field label="현재 테마" value={theme ?? '(아직 못 받음)'} />
        <Text style={styles.note}>
          아래 네이티브 바의 버튼은 소비 앱 코드입니다. RnSdk.notifyThemeChanged() 를
          부르면 SDK 가 RN 으로 흘려보냅니다.
        </Text>
      </Section>

      <Section title="닫기">
        <Button title="닫기" onPress={close} />
      </Section>
    </ScrollView>
  );
}
