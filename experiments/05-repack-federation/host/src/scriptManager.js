import { Platform } from 'react-native';
import { ScriptManager, Script } from '@callstack/repack/client';

/**
 * 원격 번들을 어디서 받을지 정하는 곳입니다.
 *
 * Metro 는 번들이 하나라 이런 게 없습니다. 앱이 켜질 때 그 하나를 통째로 읽고 끝입니다.
 * Re.Pack 은 번들이 여러 개라, "이 조각을 어디서 가져오나"를 앱이 답해야 합니다.
 * 그 답을 하는 게 ScriptManager 입니다.
 *
 * 06 번에서 카나리와 블루그린을 다룰 때 이 파일이 무대가 됩니다.
 * 여기서 사용자마다 다른 주소를 돌려주면 그게 카나리이고,
 * 주소 하나를 통째로 바꾸면 그게 블루그린입니다.
 * 배포 전략이 인프라가 아니라 이 함수 안에 들어온다는 게 이 방식의 특징입니다.
 */
// Android 에뮬레이터는 호스트 머신이 10.0.2.2, iOS 시뮬레이터는 localhost 입니다.
// 경로의 플랫폼 세그먼트도 각자 자기 것(android, ios 산출물)을 봅니다.
const HOST_MACHINE = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
const REMOTE_BASE = `http://${HOST_MACHINE}:4100`;
const PLATFORM_SEGMENT = Platform.OS;

// 무엇이 언제 요청되는지 보려고 이벤트를 전부 로그로 남깁니다.
// 원격 로딩은 실패해도 조용한 경우가 있어서, 이 로그가 사실상 유일한 단서입니다.
ScriptManager.shared.on('resolving', (id, caller) =>
  console.log('[SM] resolving', id, 'caller=', caller));
ScriptManager.shared.on('loading', (script) =>
  console.log('[SM] loading', script.locator.url));
ScriptManager.shared.on('loaded', (script) =>
  console.log('[SM] loaded', script.locator.url));
ScriptManager.shared.on('error', (err) =>
  console.log('[SM] error', String(err && err.message)));

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  // 호스트 번들 자체는 앱에 내장돼 있어서 여기 오지 않습니다.
  // 여기 오는 것은 원격 컨테이너와 그 컨테이너가 쪼갠 청크들입니다.
  //
  // 컨테이너(scriptId === 원격 이름)는 파일명이 scriptId 와 달라서 따로 매핑합니다.
  // import() 경로에서는 Re.Pack 의 내장 리졸버가 remotes 설정의 entry 주소로
  // 처리해 주지만, ScriptManager.loadScript 를 직접 부르는 재시도 경로에는
  // 그 문맥이 없어서 이 매핑이 없으면 "Reference URL is missing" 이 납니다.
  const CONTAINERS = ['featureCart', 'featureProfile'];
  const url = CONTAINERS.includes(scriptId)
    ? `${REMOTE_BASE}/${PLATFORM_SEGMENT}/${scriptId}/${scriptId}.container.js.bundle`
    : `${REMOTE_BASE}/${PLATFORM_SEGMENT}/${caller ?? 'featureCart'}/${scriptId}.chunk.bundle`;

  return {
    // 두 번째 인자가 없으면 getRemoteURL 이 webpack 컨텍스트의 확장자 규칙을
    // URL 뒤에 덧붙입니다(.chunk.bundle 등). 여기 URL 은 이미 완성형이라
    // excludeExtension 으로 그대로 쓰게 합니다.
    url: Script.getRemoteURL(url, { excludeExtension: true }),
    // 캐시를 켜면 두 번째 실행부터 네트워크를 안 탑니다.
    // 측정 조건을 통제하려고 지금은 끕니다. 실제 앱에서는 켜야 합니다.
    cache: false,
    // 07 번에서 다룰 코드 서명 검증이 붙는 자리이기도 합니다.
    // 원격 번들은 앱 밖에서 오므로 무결성 확인이 필요합니다.
  };
}, {
  // Re.Pack 의 federation 연동 리졸버보다 먼저 돌게 합니다.
  // 그 리졸버는 import() 경로가 주는 문맥(reference URL)이 없으면 던지는데,
  // ScriptManager.loadScript 를 직접 부르는 재시도 경로가 그 경우입니다.
  // 이 리졸버가 먼저 URL 을 돌려주면 거기서 체인이 끝나 문제가 안 됩니다.
  priority: 100,
});
