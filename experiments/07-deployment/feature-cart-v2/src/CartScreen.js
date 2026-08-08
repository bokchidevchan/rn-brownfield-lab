import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 장바구니의 v2 릴리스입니다. 더미 변경 두 가지가 들어 있습니다.
 * 배지 색(주황)과 릴리스 노트 한 줄. 화면에서 버전이 즉시 구분되게 하는 게
 * 목적입니다. 카나리와 블루그린 실험에서 "지금 어느 판이 떴나"를
 * 스크린샷만으로 판정할 수 있어야 합니다.
 */
export const VERSION = 'v2';

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
      <Row label="이번 릴리스" value="결제 버튼 문구 개선 (더미)" />
      <Row label="React 인스턴스" value="호스트에서 빌림" />

      <Text style={s.note}>
        이 화면이 주황 배지로 보이면 v2 번들을 받은 것입니다. 앱(APK)은 v1 을
        보던 것과 같은 것입니다. 바뀐 것은 서버의 배포 상태뿐입니다.
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
    alignSelf: 'flex-start', backgroundColor: '#e8590c', color: '#fff',
    fontSize: 12, fontWeight: '600', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111114' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14, color: '#6b6b74' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111114' },
  note: { fontSize: 12, lineHeight: 18, color: '#6b6b74' },
});
