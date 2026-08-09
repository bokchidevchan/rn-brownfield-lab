import { defineConfig } from '@stackflow/config';

/**
 * 스택에 올라갈 화면들을 선언합니다.
 *
 * 03 번에서 웹뷰의 불편함으로 꼽은 것이 "화면을 오갈 때마다 문서를 다시 받는다"와
 * "뒤로가기 스택이 두 개가 된다" 였습니다. Stackflow 는 그중 앞의 것을
 * 웹 안에서 풉니다. 화면 이동이 문서 로드가 아니라 스택 push 가 됩니다.
 *
 * transitionDuration 은 네이티브 전환 시간에 맞춥니다.
 * iOS 의 기본 push 전환이 350ms 근처라 이 값이 기본값입니다.
 */
export const config = defineConfig({
  activities: [
    { name: 'ProductList' },
    { name: 'ProductDetail' },
    { name: 'ReviewList' },
  ],
  transitionDuration: 350,
});
