/**
 * RN 인스턴스가 화면 간에 공유되는지 눈으로 확인하기 위한 카운터입니다.
 *
 * 이 값은 모듈 스코프에 있으므로 JS 컨텍스트가 살아 있는 동안 유지됩니다.
 * - 네이티브 화면 → RN 화면을 반복해서 들어갔을 때 숫자가 계속 올라가면
 *   ReactHost/RCTBridge 를 재사용하고 있다는 뜻입니다.
 * - 들어갈 때마다 1 로 초기화되면 진입할 때마다 인스턴스를 새로 만들고 있는 것이고,
 *   그만큼 화면 진입이 느려집니다.
 */
let mountCount = 0;
const startedAt = Date.now();

export function markMount() {
  mountCount += 1;
  return {
    mountCount,
    contextAgeMs: Date.now() - startedAt,
  };
}
