import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 두 번째 원격 화면입니다.
 *
 * 장바구니와 다른 팀이 만들었다고 가정한 화면이라, 일부러 상태(카운터)를
 * 넣었습니다. 원격에서 받아온 코드의 useState 가 정상 동작하면
 * 호스트의 React 인스턴스를 제대로 빌려 쓰고 있다는 뜻입니다.
 * React 가 두 벌이면 훅이 "Invalid hook call" 로 깨집니다.
 */
export const VERSION = 'v1';

export default function ProfileScreen({ onReady }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <View style={s.section}>
      <Text style={s.badge}>REMOTE {VERSION}</Text>
      <Text style={s.title}>프로필</Text>

      <Row label="번들 출처" value="원격 (featureProfile)" />
      <Row label="피처 버전" value={VERSION} />
      <Row label="React 인스턴스" value="호스트에서 빌림" />

      <Pressable style={s.button} onPress={() => setCount(c => c + 1)}>
        <Text style={s.buttonText}>카운터 {count}</Text>
      </Pressable>
      <Text style={s.note}>
        이 버튼의 useState 는 호스트의 React 로 돌아갑니다. 원격 코드와
        호스트 코드가 같은 런타임을 쓴다는 증거입니다.
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
    alignSelf: 'flex-start', backgroundColor: '#6741d9', color: '#fff',
    fontSize: 12, fontWeight: '600', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111114' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14, color: '#6b6b74' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111114' },
  note: { fontSize: 12, lineHeight: 18, color: '#6b6b74' },
  button: {
    borderRadius: 10, backgroundColor: '#6741d9',
    paddingVertical: 12, alignItems: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
