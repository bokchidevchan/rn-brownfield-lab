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
 * 장바구니와 프로필 화면은 여기 없습니다. 버튼을 누르는 순간
 * 각각의 원격에서 받아 옵니다. import() 가 그 경계입니다.
 *
 * React.lazy + Suspense 를 쓰지 않고 import() 의 promise 를 직접 다룹니다.
 * 이유가 두 가지입니다.
 *
 * 1. 측정. 탭 → 모듈 평가 완료(then 도달)와 탭 → 실제 마운트(onReady)를
 *    나눠 재려면 promise 를 손에 쥐고 있어야 합니다. lazy 는 이걸 숨깁니다.
 * 2. 원격 로드는 로컬 코드 스플리팅과 달리 실패가 정상 경로의 일부입니다.
 *    상태 기계(idle → loading → ready | error)로 두면 실패 처리와 재시도가
 *    분기 하나씩입니다.
 */

/**
 * 피처 목록. 원격을 하나 추가할 때 호스트가 알아야 하는 것의 전부입니다.
 *
 * load 가 함수로 감싸여 있는 이유: import() 의 인자는 번들러가 빌드 타임에
 * 정적으로 읽습니다. import(변수) 는 안 되므로, 피처마다 정적 문자열을 가진
 * 함수를 하나씩 둡니다.
 */
const FEATURES = {
  featureCart: {
    title: '장바구니',
    buttonLabel: '장바구니 열기 (원격에서 받아옴)',
    expose: './CartScreen',
    load: () => import('featureCart/CartScreen'),
  },
  featureProfile: {
    title: '프로필',
    buttonLabel: '프로필 열기 (원격에서 받아옴)',
    expose: './ProfileScreen',
    load: () => import('featureProfile/ProfileScreen'),
  },
};

/**
 * 컨테이너 프로토콜로 원격 모듈을 직접 로드합니다.
 *
 * import('featureCart/CartScreen') 한 줄이 실제로 하는 일을 푼 것입니다.
 *   1. 컨테이너 스크립트를 받아 실행 → global[원격이름] 이 생김
 *   2. container.init(공유 스코프) → 원격이 호스트의 react 를 쓰게 연결
 *   3. container.get('./CartScreen') → 모듈 팩토리를 받아 실행
 *
 * 실패 후 재시도에서만 씁니다. 폴백 플러그인이 돌려준 실패 마커를
 * federation 런타임이 정상 모듈로 캐시해 버려서, 재시도 import() 는
 * 네트워크 대신 그 캐시를 받기 때문입니다. 성공 경로는 import() 로 충분합니다.
 */
async function loadBypassingCache(name, expose) {
  await ScriptManager.shared.loadScript(name);
  const container = global[name];
  if (!container) {
    throw new Error('컨테이너를 받았지만 전역에 등록되지 않았습니다');
  }
  const host = global.__mfFederationHost;
  try {
    await container.init(host?.shareScopeMap?.default ?? {});
  } catch (e) {
    // 같은 컨테이너를 두 번 init 하면 던지는 경우가 있는데, 무해합니다.
  }
  const factory = await container.get(expose);
  return factory();
}

export default function HostScreen() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.badge}>HOST</Text>
      <Text style={s.title}>호스트 셸</Text>

      <View style={s.section}>
        <Text style={s.h2}>이 번들에 든 것</Text>
        <Text style={s.note}>
          RN 런타임, React, 공유 의존성, 이 화면. 앱에 내장돼 있습니다.
          장바구니와 프로필 화면은 없습니다. 각각 다른 원격에서 옵니다.
        </Text>
      </View>

      {Object.entries(FEATURES).map(([name, meta]) => (
        <RemoteFeature key={name} name={name} meta={meta} />
      ))}
    </ScrollView>
  );
}

/**
 * 원격 피처 하나의 로드 상태를 관리하는 단위입니다.
 * 피처끼리 상태가 독립이라, 하나가 실패해도 다른 하나는 정상 동작합니다.
 */
function RemoteFeature({ name, meta }) {
  const [state, setState] = useState({ status: 'idle' });
  const [mountedAt, setMountedAt] = useState(null);

  const open = () => {
    if (state.status === 'loading') {
      return;
    }
    const t0 = Date.now();
    setMountedAt(null);
    const wasError = state.status === 'error';
    setState({ status: 'loading' });

    const load = wasError ? loadBypassingCache(name, meta.expose) : meta.load();

    load
      .then(mod => {
        // mfFallbackPlugin 이 실패를 마커 객체로 바꿔서 여기로 보냅니다.
        // 마커가 interop 에 의해 default 로 감싸일 수 있어서 양쪽을 다 봅니다.
        const failure = mod?.__mfLoadError ?? mod?.default?.__mfLoadError;
        if (failure != null || typeof mod?.default !== 'function') {
          setState({
            status: 'error',
            message: failure ?? '원격 번들을 받지 못했습니다',
          });
          return;
        }
        console.log(`[MEASURE] ${name} tap->eval`, Date.now() - t0, 'ms');
        setState({
          status: 'ready',
          Component: mod.default,
          version: mod.VERSION,
          loadMs: Date.now() - t0,
          tapAt: t0,
        });
      })
      .catch(err => {
        setState({ status: 'error', message: err?.message ?? String(err) });
      });
  };

  return (
    <>
      <View style={s.section}>
        <Text style={s.h2}>원격 피처: {meta.title}</Text>
        {state.status === 'ready' && (
          <>
            <View style={s.row}>
              <Text style={s.rowLabel}>탭 → 모듈 평가 (다운로드 포함)</Text>
              <Text style={s.rowValue}>{state.loadMs}ms</Text>
            </View>
            {mountedAt !== null && (
              <View style={s.row}>
                <Text style={s.rowLabel}>탭 → 원격 화면 마운트</Text>
                <Text style={s.rowValue}>{mountedAt}ms</Text>
              </View>
            )}
          </>
        )}
        {state.status === 'error' && (
          <Text style={[s.note, { color: '#c92a2a' }]}>
            원격 로드 실패: {state.message}
          </Text>
        )}
        <Pressable style={s.button} onPress={open}>
          <Text style={s.buttonText}>
            {state.status === 'error' ? `${meta.title} 다시 시도` : meta.buttonLabel}
          </Text>
        </Pressable>
      </View>

      {state.status === 'loading' && (
        <View style={[s.section, { alignItems: 'center' }]}>
          <ActivityIndicator />
          <Text style={s.note}>원격 번들 받는 중</Text>
        </View>
      )}

      {state.status === 'ready' && (
        <state.Component
          onReady={() => {
            if (mountedAt === null) {
              const ms = Date.now() - state.tapAt;
              console.log(`[MEASURE] ${name} tap->mount`, ms, 'ms');
              setMountedAt(ms);
            }
          }}
        />
      )}
    </>
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
