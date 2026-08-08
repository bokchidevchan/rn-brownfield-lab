import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { bucketOf, getManifest, versionFor } from './deploymentClient';

/**
 * 배포 실험용 호스트 셸.
 *
 * 위쪽에 배포 상태(전략, 슬롯, 포인터)와 사용자 1~10 이 각자 어느 버전에
 * 배정되는지를 보여 줍니다. 사용자를 고르고 장바구니를 열면 그 사용자의
 * 채널로 원격 번들을 받습니다.
 *
 * 배포 결정은 세션당 한 번입니다. 로드 후 서버에서 배포를 바꾸면
 * 이 화면은 "재시작 후 적용" 안내를 띄웁니다. 실서비스 OTA 들이
 * 다음 콜드 스타트에 적용하는 것과 같은 동작을 일부러 재현한 것입니다.
 */

const USERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function HostScreen() {
  const [manifest, setManifest] = useState(null);
  const [manifestError, setManifestError] = useState(null);
  const [userId, setUserId] = useState(global.__deployUserId);
  const [cart, setCart] = useState({ status: 'idle' });

  useEffect(() => {
    getManifest().then(setManifest).catch(e => setManifestError(e.message));
  }, []);

  const entry = manifest?.featureCart;
  const plannedVersion = manifest ? versionFor('featureCart', manifest, userId) : null;
  // 로드가 끝난 뒤에는 실제 로드된 버전과 계획이 다른지 보여 줍니다.
  const loadedVersion = cart.status === 'ready' ? cart.version : null;

  const pickUser = id => {
    setUserId(id);
    global.__deployUserId = id;
  };

  const openCart = () => {
    if (cart.status === 'loading' || cart.status === 'ready') {
      return;
    }
    const t0 = Date.now();
    setCart({ status: 'loading' });
    import('featureCart/CartScreen')
      .then(mod => {
        const failure = mod?.__mfLoadError ?? mod?.default?.__mfLoadError;
        if (failure != null || typeof mod?.default !== 'function') {
          setCart({ status: 'error', message: failure ?? '원격 번들을 받지 못했습니다' });
          return;
        }
        console.log('[MEASURE] tap->eval', Date.now() - t0, 'ms, version', mod.VERSION);
        setCart({
          status: 'ready',
          Component: mod.default,
          version: mod.VERSION,
          loadMs: Date.now() - t0,
          asUser: global.__deployUserId,
        });
      })
      .catch(err => {
        setCart({ status: 'error', message: err?.message ?? String(err) });
      });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.badge}>HOST + 배포 제어</Text>
      <Text style={s.title}>배포 실험 셸</Text>

      <View style={s.section}>
        <Text style={s.h2}>서버의 배포 상태 (deployment.json)</Text>
        {manifestError && (
          <Text style={[s.note, { color: '#c92a2a' }]}>조회 실패: {manifestError}</Text>
        )}
        {!entry && !manifestError && <ActivityIndicator />}
        {entry && (
          <>
            <Row label="전략" value={entry.strategy} />
            <Row label="blue (안정판)" value={entry.blue} />
            <Row label="green (후보판)" value={entry.green} />
            {entry.strategy === 'blue-green' ? (
              <Row label="active 포인터" value={entry.active} />
            ) : (
              <Row label="카나리 비율" value={`${entry.canaryRatio}%`} />
            )}
          </>
        )}
        <Text style={s.note}>
          이 상태는 서버가 들고 있습니다. curl 로 바꾼 뒤 앱을 재시작하면
          아래 배정이 바뀝니다. 앱(APK)은 그대로입니다.
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>사용자별 배정 (결정적 해시 버킷)</Text>
        <View style={s.userGrid}>
          {USERS.map(id => {
            const v = manifest ? versionFor('featureCart', manifest, id) : '?';
            const selected = id === userId;
            return (
              <Pressable
                key={id}
                onPress={() => pickUser(id)}
                style={[s.userChip, selected && s.userChipSelected]}>
                <Text style={[s.userChipText, selected && s.userChipTextSelected]}>
                  {id}번 {'→'} {v ?? '?'}
                </Text>
                <Text style={[s.userChipSub, selected && s.userChipTextSelected]}>
                  버킷 {bucketOf('featureCart', id)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.note}>
          버킷은 사용자 id 의 해시라서 재시작해도 같습니다. 카나리 비율보다
          버킷이 작은 사용자만 green 을 받습니다. 블루그린에서는 전원이
          active 쪽을 받습니다.
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>원격 피처 로드</Text>
        <Row label="현재 사용자" value={`${userId}번`} />
        {plannedVersion && <Row label="이 사용자의 배정" value={plannedVersion} />}
        {cart.status === 'ready' && (
          <>
            <Row label="실제 로드된 버전" value={`${cart.version} (${cart.asUser}번 사용자로)`} />
            <Row label="탭 → 모듈 평가" value={`${cart.loadMs}ms`} />
          </>
        )}
        {cart.status === 'error' && (
          <Text style={[s.note, { color: '#c92a2a' }]}>로드 실패: {cart.message}</Text>
        )}
        {loadedVersion && plannedVersion && loadedVersion !== plannedVersion && (
          <Text style={[s.note, { color: '#e8590c' }]}>
            배정({plannedVersion})과 로드된 버전({loadedVersion})이 다릅니다.
            배포 결정은 세션당 한 번이라 재시작해야 적용됩니다.
          </Text>
        )}
        <Pressable
          style={[s.button, cart.status === 'ready' && s.buttonDisabled]}
          onPress={openCart}>
          <Text style={s.buttonText}>
            {cart.status === 'ready'
              ? '로드됨 (바꾸려면 앱 재시작)'
              : '장바구니 열기 (배정된 버전으로)'}
          </Text>
        </Pressable>
      </View>

      {cart.status === 'loading' && (
        <View style={[s.section, { alignItems: 'center' }]}>
          <ActivityIndicator />
          <Text style={s.note}>원격 번들 받는 중</Text>
        </View>
      )}

      {cart.status === 'ready' && <cart.Component />}
    </ScrollView>
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
  screen: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 20, gap: 16 },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#111114', color: '#fff',
    fontSize: 12, fontWeight: '600', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111114' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  h2: { fontSize: 13, fontWeight: '700', color: '#6b6b74', letterSpacing: 0.4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14, color: '#6b6b74' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111114' },
  note: { fontSize: 12, lineHeight: 18, color: '#6b6b74' },
  button: {
    borderRadius: 10, backgroundColor: '#1f6feb',
    paddingVertical: 12, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#adb5bd' },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  userGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  userChip: {
    borderRadius: 8, borderWidth: 1, borderColor: '#dee2e6',
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f8f9fa',
  },
  userChipSelected: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  userChipText: { fontSize: 13, fontWeight: '600', color: '#111114' },
  userChipTextSelected: { color: '#fff' },
  userChipSub: { fontSize: 10, color: '#868e96' },
});
