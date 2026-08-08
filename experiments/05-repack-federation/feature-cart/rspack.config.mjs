import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 피처 번들 설정.
 *
 * 이 번들이 작아야 이 실험이 성공한 것입니다.
 * react 와 react-native 가 여기 들어가면 03 번에서 지적한 중복이 그대로 재현됩니다.
 *
 * 확인 방법은 빌드 결과 크기입니다. 호스트 번들은 MB 단위인데
 * 이쪽이 KB 단위로 나와야 합니다.
 */
export default (env) => {
  const { mode = 'production', platform, ...rest } = env;

  return {
    mode,
    context: dirname,
    // 원격 컨테이너는 진입점이 없습니다. 노출할 모듈만 있습니다.
    // 그래서 entry 를 비웁니다.
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

        /**
         * 컨테이너 파일명을 명시합니다.
         *
         * 안 적으면 엔트리 번들과 이름이 겹쳐서 이렇게 실패합니다.
         *   Conflict: Multiple assets emit different content to the same filename index.bundle
         *
         * CLI 의 bundle 명령이 --entry-file 을 강제하는데, 원격 컨테이너는
         * 원래 진입점이 없는 물건이라 생기는 충돌입니다.
         */
        filename: 'featureCart.container.js.bundle',

        /**
         * 호스트가 import('featureCart/CartScreen') 으로 부를 이름입니다.
         * 이 문자열이 호스트와 피처 사이의 계약입니다.
         *
         * 06 번에서 다룰 버전 스큐가 여기서 생깁니다. 피처를 새로 배포했는데
         * 노출 이름이나 props 를 바꿨다면, 아직 옛 호스트를 쓰는 사용자가 깨집니다.
         */
        exposes: {
          './CartScreen': './src/CartScreen.js',
        },

        /**
         * 여기를 비워 두면 안 됩니다. 이 실험에서 가장 중요한 발견입니다.
         *
         * Re.Pack 의 MF2 플러그인은 react 와 react-native 를
         * singleton: true, eager: true 로 기본 설정합니다.
         * eager: true 는 "번들에 같이 넣어라"는 뜻이라 호스트에는 맞지만
         * 원격에는 정반대입니다.
         *
         * 기본값 그대로 두고 빌드했더니 컨테이너가 842KB 로 나왔습니다.
         * 안을 열어 보니 AppRegistry, __fbBatchedBridge, StyleSheet 가 다 있었습니다.
         * react-native 를 통째로 안고 있던 겁니다.
         * 그러면 번들을 쪼갠 의미가 없습니다. 03 번에서 지적한 중복이 그대로 재현됩니다.
         *
         * eager: false 로 바꾸면 호스트가 이미 로드한 것을 빌려 씁니다.
         */
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
