const path = require('path');

/**
 * webpack 쪽 설정.
 *
 * webpack 자체는 JSX 를 모릅니다. babel-loader 를 달아야 하고,
 * 그 조합이 webpack 빌드가 느린 이유의 큰 몫입니다.
 * (esbuild 는 JSX/TS 파서가 내장이라 이 단계가 없습니다)
 *
 * 실무 webpack 설정에는 여기에 css 로더, 에셋 로더, 환경 분기,
 * 캐시 설정이 더 붙습니다. 이 실험은 비교의 공정성을 위해 최소로 둡니다.
 */
module.exports = {
  mode: 'production',
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist-webpack'),
    filename: 'main.js',
    chunkFilename: '[name].chunk.js',
    // 기본값 'auto' 는 document.currentScript 로 자기 위치를 추정하는데,
    // 헤드리스 검증(인라인 실행)에서는 그게 없어 던집니다. 명시가 안전합니다.
    publicPath: '',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-react', { runtime: 'automatic' }]],
          },
        },
      },
    ],
  },
};
