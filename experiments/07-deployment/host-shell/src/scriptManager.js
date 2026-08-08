import { Platform } from 'react-native';
import { ScriptManager, Script } from '@callstack/repack/client';

import { DEPLOY_BASE, getManifest, versionFor } from './deploymentClient';

/**
 * 배포 전략이 실제로 작동하는 지점입니다.
 *
 * 05 에서 이 리졸버는 URL 템플릿 하나였습니다. 07 에서는 URL 을 만들기 전에
 * 배포 상태를 읽고 버전을 결정합니다. 카나리든 블루그린이든, 클라이언트가
 * 하는 일은 "리졸버가 다른 디렉토리를 가리킨다"가 전부입니다.
 *
 * 현재 사용자는 global.__deployUserId 로 정합니다. 실서비스라면 로그인
 * 사용자 id 나 기기 id 가 올 자리입니다. UI 에서 바꿔가며 카나리 버킷이
 * 갈리는 것을 볼 수 있게 전역으로 뒀습니다.
 */
global.__deployUserId = global.__deployUserId ?? 1;

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  const manifest = await getManifest();
  const version = versionFor('featureCart', manifest, global.__deployUserId);
  if (!version) {
    return undefined;
  }

  const base = `${DEPLOY_BASE}/releases/featureCart/${version}/${Platform.OS}`;
  const url =
    scriptId === 'featureCart'
      ? `${base}/featureCart.container.js.bundle`
      : `${base}/${scriptId}.chunk.bundle`;

  // 어떤 결정이 내려졌는지 화면에서 보여 주려고 남깁니다.
  global.__deployResolved = { version, url };
  console.log('[DEPLOY] user', global.__deployUserId, '->', version, scriptId);

  return {
    url: Script.getRemoteURL(url, { excludeExtension: true }),
    // 배포 실험이라 캐시를 끕니다. 실서비스는 켜되, 버전이 URL 에 들어
    // 있으므로 (releases/<버전>/...) 새 배포는 자연히 캐시 미스가 됩니다.
    // "URL 에 버전을 넣는다"가 캐시 무효화 전략의 전부인 셈입니다.
    cache: false,
  };
}, {
  priority: 100,
});
