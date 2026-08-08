import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 호스트 번들 설정.
 *
 * 03 번에서 이런 문제를 적었습니다.
 *
 *   "화면 A 와 화면 B 를 별도 번들로 만들면 두 번들 각각에 프레임워크 JS 700KB 가
 *    통째로 들어갑니다. 같은 것을 두 번 받고 두 번 파싱합니다."
 *
 * Module Federation 이 그 문제의 해법입니다. 호스트가 react 와 react-native 를
 * 공유 의존성으로 들고 있고, 원격 번들은 그걸 참조만 합니다.
 * 원격 번들에는 그 화면의 코드만 들어갑니다.
 *
 * Metro 대신 Rspack 을 씁니다. Metro 에는 이 기능이 없습니다.
 */
export default (env) => {
  const { mode = 'production', platform, ...rest } = env;

  return {
    mode,
    context: dirname,
    entry: './index.js',
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
        name: 'host',

        /**
         * 원격 컨테이너 목록. 이름과 주소를 여기서 고정합니다.
         *
         * 주소가 빌드 타임에 박히는 게 불편해 보이지만, 06 번(카나리와 블루그린)에서
         * 이걸 런타임에 바꾸는 방법을 다룹니다. 그게 배포 전략의 핵심입니다.
         *
         * Android 에뮬레이터는 호스트를 10.0.2.2 로 봅니다. 03 번과 같습니다.
         */
        /**
         * mf-manifest.json 이 아니라 컨테이너 번들을 직접 가리킵니다.
         *
         * 매니페스트 방식도 동작하지만 두 가지 이유로 직접 지정을 씁니다.
         * 런타임 요청이 한 건 줄고(매니페스트 → 컨테이너 → 청크에서
         * 컨테이너 → 청크로), 매니페스트 fetch 실패가 import() 의 promise
         * 체인 밖에서 터져서 errorLoadRemote 훅 없이는 앱 크래시가 됩니다.
         * 컨테이너 직접 지정이면 실패 지점이 스크립트 로드 하나로 모입니다.
         */
        remotes: {
          featureCart:
            'featureCart@http://10.0.2.2:4100/android/featureCart/featureCart.container.js.bundle',
        },

        /**
         * 원격 로드 실패를 크래시 대신 폴백으로 바꾸는 런타임 플러그인.
         * 아래 src/mfFallbackPlugin.js 주석에 이유를 적었습니다.
         */
        runtimePlugins: [
          path.join(dirname, 'src/mfFallbackPlugin.js'),
        ],

        /**
         * 공유 의존성.
         *
         * Re.Pack 의 MF2 플러그인이 react 와 react-native 를
         * singleton: true, eager: true 로 기본 설정합니다.
         * 여기서는 그 기본값을 그대로 쓰되, 왜 singleton 이어야 하는지만 남깁니다.
         *
         * React 가 두 벌 로드되면 훅이 깨집니다. 웹에서도 같지만 RN 은 더 심합니다.
         * 네이티브 모듈 레지스트리와 뷰 매니저가 런타임 하나를 전제하기 때문입니다.
         */
      }),
    ],
  };
};
