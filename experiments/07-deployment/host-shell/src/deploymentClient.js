import { Platform } from 'react-native';

/**
 * 배포 결정 로직. 이 파일이 07 실험의 심장입니다.
 *
 * 서버의 deployment.json 을 읽고 "이 사용자는 어느 버전을 받아야 하나"를
 * 계산합니다. 결정이 클라이언트에서 일어나는 이유는 CDN 친화성입니다.
 * 서버가 사용자마다 다른 응답을 만들 필요 없이, 정적 상태 파일 하나와
 * 정적 번들들만 CDN 에 두면 됩니다. CodePush 도 같은 구조입니다.
 */

const HOST_MACHINE = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
export const DEPLOY_BASE = `http://${HOST_MACHINE}:4200`;

let manifestPromise = null;

/**
 * 배포 상태를 한 번만 받아 세션 내내 씁니다.
 *
 * 일부러 세션 단위로 고정합니다. 화면을 보는 중에 배포가 바뀌어
 * 화면 절반은 v1, 절반은 v2 가 되는 상황을 막는 가장 단순한 방법이
 * "결정은 시작 시 한 번"이기 때문입니다. CodePush 가 다음 재시작에
 * 적용하는 것과 같은 이유입니다.
 */
export function getManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(`${DEPLOY_BASE}/deployment.json`, {
      headers: { 'Cache-Control': 'no-store' },
    }).then(r => {
      if (!r.ok) {
        throw new Error(`배포 상태 조회 실패 HTTP ${r.status}`);
      }
      return r.json();
    });
    // 실패하면 다음 호출이 다시 시도하게 캐시를 비웁니다.
    manifestPromise.catch(() => {
      manifestPromise = null;
    });
  }
  return manifestPromise;
}

/**
 * 사용자를 0~99 버킷에 결정적으로 배치합니다. FNV-1a 해시.
 *
 * 결정적이어야 하는 이유: 같은 사용자는 앱을 다시 켜도 같은 버킷이어야
 * 합니다. 재시작할 때마다 v1 과 v2 를 오가면 사용자에게는 버그로 보이고,
 * 지표에서는 두 집단이 섞입니다. Math.random 을 쓰면 안 되는 이유입니다.
 */
export function bucketOf(feature, userId) {
  const key = `${feature}:${userId}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100;
}

/**
 * 배포 상태와 사용자로부터 버전을 결정합니다.
 *
 * blue-green: active 포인터가 가리키는 쪽. 전원이 같은 판을 봅니다.
 *             전환도 롤백도 포인터 하나 바꾸는 일이라 즉시이고 전면적입니다.
 * canary:     버킷이 ratio 미만인 사용자만 green(후보판). 나머지는 blue(안정판).
 *             ratio 를 0 → 5 → 30 → 100 으로 올리는 게 점진 배포이고,
 *             문제가 보이면 0 으로 내리는 게 롤백입니다.
 */
export function versionFor(feature, manifest, userId) {
  const entry = manifest[feature];
  if (!entry) {
    return null;
  }
  if (entry.strategy === 'canary') {
    const bucket = bucketOf(feature, userId);
    return bucket < entry.canaryRatio ? entry.green : entry.blue;
  }
  return entry.active === 'green' ? entry.green : entry.blue;
}
