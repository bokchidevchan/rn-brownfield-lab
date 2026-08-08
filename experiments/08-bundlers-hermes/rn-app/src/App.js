import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 번들러 비교용 최소 RN 화면입니다.
 * 같은 이 소스를 Metro 와 Re.Pack(Rspack)으로 각각 번들합니다.
 * esbuild 는 RN 코어의 Flow 문법에서 막히는 것을 raw 실행으로 확인합니다.
 */
export default function App() {
  const [count, setCount] = useState(0);

  return (
    <View style={s.screen}>
      <Text style={s.title}>번들러 비교</Text>
      <Pressable style={s.button} onPress={() => setCount(c => c + 1)}>
        <Text style={s.buttonText}>카운터 {count}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  button: {
    borderRadius: 10, backgroundColor: '#1f6feb',
    paddingHorizontal: 24, paddingVertical: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
