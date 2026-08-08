import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 배포 전략을 아는 호스트의 빌드 설정.
 *
 * 05 의 호스트와 다른 점은 remotes 주소뿐입니다. 여기 적는 주소는
 * 빌드 타임 기본값이고, 실제로 어떤 버전을 받을지는 런타임에
 * scriptManager 의 리졸버가 deployment.json 을 읽고 결정합니다.
 * 그게 이 실험의 전부입니다. 배포 전략 = 리졸버가 URL 을 고르는 규칙.
 */
function remotesFor(platform) {
  const hostMachine = platform === 'ios' ? 'localhost' : '10.0.2.2';
  return {
    featureCart: `featureCart@http://${hostMachine}:4200/releases/featureCart/v1/${platform}/featureCart.container.js.bundle`,
  };
}

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
        remotes: remotesFor(platform),
        runtimePlugins: [
          path.join(dirname, 'src/mfFallbackPlugin.js'),
        ],
      }),
    ],
  };
};
