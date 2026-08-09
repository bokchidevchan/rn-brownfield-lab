import { defineConfig } from '@stackflow/config';

/**
 * 스택에 올라갈 화면과 각 화면의 주소를 선언합니다.
 *
 * 처음에는 문서 페이지만 보고 라우트를 historySyncPlugin 의 routes 옵션에
 * 따로 적었는데, 당근의 공식 데모(daangn/stackflow 의 demo)는 그렇게 하지 않습니다.
 * route 를 여기 config 안에 두고 플러그인에는 config 를 통째로 넘깁니다.
 * 그래야 initialActivity 같은 값도 플러그인과 어긋나지 않습니다.
 * 예전 방식으로 쓰면 "어떤 플러그인이 initialActivity 를 덮어썼다"는 경고가 납니다.
 *
 * transitionDuration 은 데모가 270ms 를 쓰길래 맞췄습니다.
 * 03 번에서 잰 웹뷰 진입 시간이 수백 ms 대였던 것과 비교하면,
 * 전환 자체는 그보다 짧게 잡아야 답답해 보이지 않습니다.
 */
export const config = defineConfig({
  activities: [
    {
      name: 'ProductList',
      route: '/stackflow/',
    },
    {
      name: 'ProductDetail',
      route: '/stackflow/products/:productId',
    },
    {
      name: 'ReviewList',
      route: '/stackflow/products/:productId/reviews',
    },
  ],
  transitionDuration: 270,
  initialActivity: () => 'ProductList',
});
