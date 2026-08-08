import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 원격으로 배포되는 화면입니다.
 *
 * 이 파일은 앱 안에 없습니다. 호스트가 필요할 때 네트워크에서 받아 옵니다.
 * 앱을 다시 배포하지 않고 이 화면만 바꿀 수 있다는 게 이 구조의 목적입니다.
 *
 * 버전 문자열을 화면에 띄워 두는 이유는 06 번 때문입니다.
 * 카나리와 블루그린을 시연하려면 "지금 어느 버전이 떴는지"가 보여야 합니다.
 */
export const VERSION = 'v1';

export default function CartScreen({ onReady }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <View style={s.section}>
      <Text style={s.badge}>REMOTE {VERSION}</Text>
      <Text style={s.title}>장바구니</Text>

      <Row label="번들 출처" value="원격" />
      <Row label="피처 버전" value={VERSION} />
      <Row label="React 인스턴스" value="호스트에서 빌림" />

      <Text style={s.note}>
        이 화면의 코드는 앱에 들어 있지 않습니다. 호스트가 import() 로 받아 왔습니다.
        react 와 react-native 는 이 번들에 없고 호스트 것을 씁니다.
        그래서 이 번들이 KB 단위입니다.
      </Text>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#2f9e44', color: '#fff',
    fontSize: 12, fontWeight: '600', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111114' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14, color: '#6b6b74' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111114' },
  note: { fontSize: 12, lineHeight: 18, color: '#6b6b74' },
});
