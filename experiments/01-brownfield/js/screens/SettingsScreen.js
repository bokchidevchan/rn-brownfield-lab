import React, {useMemo} from 'react';
import {ScrollView, Text} from 'react-native';

import {Button, Field, Section, styles} from '../components/ui';
import {markMount} from '../instanceCounter';
import {closeScreen} from '../native/HostBridge';

/**
 * 두 번째 RN 진입점. 화면 하나짜리 예제로는 확인이 안 되는 것들을 보려고 둡니다.
 *
 * - 같은 RN 인스턴스 위에 서로 다른 moduleName 을 올릴 수 있는가
 * - 상세 화면에서 올라간 마운트 카운터를 이 화면에서도 이어서 보는가
 *   (= JS 컨텍스트를 공유하는가)
 */
export default function SettingsScreen(props) {
  const {userTier = 'FREE'} = props;
  const instance = useMemo(() => markMount(), []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.badge}>React Native</Text>
      <Text style={styles.title}>설정</Text>

      <Section title="상태">
        <Field label="userTier" value={userTier} />
        <Field label="이 컨텍스트에서 마운트된 횟수" value={instance.mountCount} />
        <Text style={styles.note}>
          상품 상세를 먼저 열었다가 이 화면에 들어왔을 때 카운터가 이어지면 두 화면이 같은
          JS 컨텍스트를 쓰고 있는 것입니다. moduleName 만 다를 뿐 인스턴스는 하나입니다.
        </Text>
      </Section>

      <Section title="닫기">
        <Button title="네이티브로 돌아가기" onPress={closeScreen} />
      </Section>
    </ScrollView>
  );
}
