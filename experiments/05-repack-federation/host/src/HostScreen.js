import React, { useState } from 'react';
import { ScriptManager } from '@callstack/repack/client';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/**
 * 호스트 셸. 이 화면은 앱에 내장된 번들에 들어 있습니다.
 *
 * 장바구니 화면은 여기 없습니다. 버튼을 누르는 순간 네트워크에서 받아 옵니다.
 * import() 가 그 경계입니다.
 *
 * React.lazy + Suspense 를 쓰지 않고 import() 의 promise 를 직접 다룹니다.
 * 이유가 두 가지입니다.
 *
 * 1. 측정. 탭 → 모듈 평가 완료(then 도달)와 탭 → 실제 마운트(onReady)를
 *    나눠 재려면 promise 를 손에 쥐고 있어야 합니다. lazy 는 이걸 숨깁니다.
 * 2. 원격 로드는 로컬 코드 스플리팅과 달리 실패가 정상 경로의 일부입니다.
 *    서버가 죽거나, 번들이 호스트와 안 맞거나. 상태 기계(idle → loading →
 *    ready | error)로 두면 실패 처리와 재시도가 분기 하나씩입니다.
 *    lazy 방식은 같은 일을 하려면 ErrorBoundary 와 lazy 인스턴스 재생성이
 *    필요해서 오히려 길어집니다.
 */

/**
 * 컨테이너 프로토콜로 원격 모듈을 직접 로드합니다.
 *
 * import('featureCart/CartScreen') 한 줄이 실제로 하는 일을 푼 것입니다.
 *   1. 컨테이너 스크립트를 받아 실행 → global.featureCart 가 생김
 *   2. container.init(공유 스코프) → 원격이 호스트의 react 를 쓰게 연결
 *   3. container.get('./CartScreen') → 모듈 팩토리를 받아 실행
 *
 * 실패 후 재시도에서만 씁니다. 성공 경로는 import() 로 충분합니다.
 */
async function loadCartBypassingCache() {
  await ScriptManager.shared.loadScript('featureCart');
  const container = global.featureCart;
  if (!container) {
    throw new Error('컨테이너를 받았지만 전역에 등록되지 않았습니다');
  }
  const host = global.__mfFederationHost;
  try {
    await container.init(host?.shareScopeMap?.default ?? {});
  } catch (e) {
    // 같은 컨테이너를 두 번 init 하면 던지는 경우가 있는데, 무해합니다.
  }
  const factory = await container.get('./CartScreen');
  return factory();
}

export default function HostScreen() {
  // idle | loading | ready | error 상태 기계 하나로 원격 로드를 관리합니다.
  const [cart, setCart] = useState({ status: 'idle' });
  const [mountedAt, setMountedAt] = useState(null);

  const openCart = () => {
    if (cart.status === 'loading') {
      return;
    }
    const t0 = Date.now();
    global.__cartLoadStart = t0;
    setMountedAt(null);

    const wasError = cart.status === 'error';
    setCart({ status: 'loading' });

    // 첫 시도는 import() 로 갑니다. 이 한 줄 뒤에서
    //   featureCart.container.js.bundle → __federation_expose_CartScreen.chunk.bundle
    // 순서로 받아 오고, 공유 의존성(react, react-native)은 호스트 것을 씁니다.
    // 서버의 /__log 로 이 목록을 그대로 확인할 수 있습니다.
    //
    // 실패했던 뒤의 재시도는 import() 를 다시 못 씁니다. 폴백 플러그인이
    // 돌려준 실패 마커를 federation 런타임이 정상 모듈로 캐시해 버려서,
    // 재시도 import 는 네트워크 대신 그 캐시를 받습니다. moduleCache 삭제나
    // registerRemotes({ force: true }) 로도 이 캐시는 안 비워졌습니다.
    // 그래서 재시도는 런타임을 우회해 컨테이너 프로토콜을 직접 밟습니다.
    // federation 이 내부에서 하는 일이 정확히 이 세 단계입니다.
    const load = wasError ? loadCartBypassingCache() : import('featureCart/CartScreen');

    load
      .then(mod => {
        // mfFallbackPlugin 이 실패를 마커 객체로 바꿔서 여기로 보냅니다.
        // 마커가 interop 에 의해 default 로 감싸일 수 있어서 양쪽을 다 봅니다.
        // default 가 함수(컴포넌트)가 아니면 전부 실패로 취급합니다.
        const failure = mod?.__mfLoadError ?? mod?.default?.__mfLoadError;
        if (failure != null || typeof mod?.default !== 'function') {
          setCart({
            status: 'error',
            message: failure ?? '원격 번들을 받지 못했습니다',
          });
          return;
        }
        console.log('[MEASURE] tap->eval', Date.now() - t0, 'ms');
        setCart({
          status: 'ready',
          Component: mod.default,
          version: mod.VERSION,
          loadMs: Date.now() - t0,
        });
      })
      .catch(err => {
        setCart({ status: 'error', message: err?.message ?? String(err) });
      });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.badge}>HOST</Text>
      <Text style={s.title}>호스트 셸</Text>

      <View style={s.section}>
        <Text style={s.h2}>이 번들에 든 것</Text>
        <Text style={s.note}>
          RN 런타임, React, 공유 의존성, 이 화면. 앱에 내장돼 있습니다.
          장바구니 화면은 없습니다.
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>원격 피처</Text>
        {cart.status === 'ready' && (
          <>
            <View style={s.row}>
              <Text style={s.rowLabel}>탭 → 모듈 평가 (다운로드 포함)</Text>
              <Text style={s.rowValue}>{cart.loadMs}ms</Text>
            </View>
            {mountedAt !== null && (
              <View style={s.row}>
                <Text style={s.rowLabel}>탭 → 원격 화면 마운트</Text>
                <Text style={s.rowValue}>{mountedAt}ms</Text>
              </View>
            )}
          </>
        )}
        {cart.status === 'error' && (
          <Text style={[s.note, { color: '#c92a2a' }]}>
            원격 로드 실패: {cart.message}
          </Text>
        )}
        <Pressable style={s.button} onPress={openCart}>
          <Text style={s.buttonText}>
            {cart.status === 'error'
              ? '다시 시도'
              : '장바구니 열기 (원격에서 받아옴)'}
          </Text>
        </Pressable>
        <Text style={s.note}>
          이 버튼을 처음 누를 때만 네트워크를 탑니다. 그 뒤로는 이미 로드된
          모듈을 씁니다.
        </Text>
      </View>

      {cart.status === 'loading' && (
        <View style={[s.section, { alignItems: 'center' }]}>
          <ActivityIndicator />
          <Text style={s.note}>원격 번들 받는 중</Text>
        </View>
      )}

      {cart.status === 'ready' && (
        <cart.Component
          onReady={() => {
            if (mountedAt === null) {
              const ms = Date.now() - global.__cartLoadStart;
              console.log('[MEASURE] tap->mount', ms, 'ms');
              setMountedAt(ms);
            }
          }}
        />
      )}
    </ScrollView>
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
  buttonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
