import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 두 번째 원격 피처.
 *
 * feature-cart 와 구조가 같습니다. 다른 것은 name, filename, exposes 세 곳뿐이고,
 * 그 세 값이 곧 "원격 하나를 추가하는 데 드는 비용의 전부"입니다.
 * 나머지(공유 의존성, 트랜스폼 규칙)는 피처가 몇 개든 똑같이 반복됩니다.
 *
 * 이름 규칙 하나만 주의합니다. package.json 의 name(feature-profile)에서
 * webpack 전역 변수 이름(webpackChunkfeature_profile)이 나오므로,
 * 피처끼리 package.json name 이 겹치면 전역이 충돌합니다.
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
        name: 'featureProfile',
        filename: 'featureProfile.container.js.bundle',
        exposes: {
          './ProfileScreen': './src/ProfileScreen.js',
        },
        // 원격 쪽은 반드시 eager: false. 이유는 feature-cart 설정에 적었습니다.
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
