import { stackflow } from '@stackflow/react';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';

import { config } from './stackflow.config';
import ProductList from './activities/ProductList';
import ProductDetail from './activities/ProductDetail';
import ReviewList from './activities/ReviewList';

/**
 * Stackflow 초기화. 당근의 공식 데모 구성을 따랐습니다.
 *
 * 층이 셋으로 나뉘어 있는 게 이 라이브러리의 특징입니다.
 *   core          스택 상태만 계산합니다. UI 를 모릅니다.
 *   renderer      상태를 화면에 어떻게 그릴지
 *   basicUIPlugin 전환 애니메이션, 앱바, 스와이프백
 *
 * historySyncPlugin 에 config 를 넘기면 스택이 브라우저 History API 와
 * 동기화됩니다. 웹뷰에서 이게 중요한 이유는 안드로이드 백 버튼 때문입니다.
 * 앱이 백 버튼을 webView.goBack() 으로 넘겨주면 그게 곧 스택 pop 이 됩니다.
 * 반대로 이 플러그인이 없으면 앱이 백을 넘겨줘도 되돌릴 히스토리가 없습니다.
 *
 * useFlow 는 여기서 나오지 않습니다. 화면 쪽에서 '@stackflow/react' 에서
 * 직접 import 합니다. 구버전 예제를 보고 여기서 구조 분해하면 undefined 가 되고
 * 렌더 시점에 "is not a function" 으로 터집니다. 처음에 이걸로 흰 화면을 봤습니다.
 */
export const { Stack, actions } = stackflow({
  config,
  components: {
    ProductList,
    ProductDetail,
    ReviewList,
  },
  plugins: [
    basicRendererPlugin(),
    basicUIPlugin({
      // cupertino 는 iOS 스타일 전환과 스와이프백입니다.
      // android 로 바꾸면 머티리얼 전환이 됩니다.
      theme: 'cupertino',
      appBar: {
        backButton: { ariaLabel: '뒤로 가기' },
        closeButton: { ariaLabel: '닫기' },
      },
    }),
    historySyncPlugin({
      config,
      fallbackActivity: () => 'ProductList',
    }),
  ],
});
