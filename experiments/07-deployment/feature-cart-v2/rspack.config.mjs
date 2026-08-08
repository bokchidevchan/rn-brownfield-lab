import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 장바구니 v2 의 빌드 설정. 05 의 v1 과 완전히 같습니다.
 *
 * 같아야 합니다. name(featureCart)과 exposes 가 호스트와의 계약이라서,
 * 버전이 바뀌어도 계약은 유지돼야 카나리와 블루그린이 성립합니다.
 * v1 사용자와 v2 사용자가 같은 호스트 코드로 다른 번들을 받는 구조이기 때문입니다.
 * 계약을 바꿔야 하는 릴리스(스크린 이름 변경, props 변경)는 이 방식으로
 * 점진 배포할 수 없고 호스트와 함께 릴리스해야 합니다.
 */
export default (env) => {
  const { mode = 'production', platform, ...rest } = env;

  return {
    mode,
    context: dirname,
    entry: {},
    resolve: {
      ...Repack.getResolveOptions(platform),
    },
    module: {
      rules: [
        ...Repack.getJsTransformRules(),
        ...Repack.getAssetTransformRules(),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({ platform, ...rest }),

      new Repack.plugins.ModuleFederationPluginV2({
        name: 'featureCart',
        filename: 'featureCart.container.js.bundle',
        exposes: {
          './CartScreen': './src/CartScreen.js',
        },
        shared: {
          react: {
            singleton: true,
            eager: false,
            requiredVersion: '18.3.1',
          },
          'react-native': {
            singleton: true,
            eager: false,
            requiredVersion: '0.76.9',
          },
        },
      }),
    ],
  };
};
