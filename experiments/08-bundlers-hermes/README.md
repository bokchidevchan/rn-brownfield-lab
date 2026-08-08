# 08. Metro, webpack, esbuild, 그리고 Hermes

네 가지를 한 실험에서 다루지만, 먼저 층을 갈라야 합니다. Metro, webpack, esbuild 는 번들러이고 Hermes 는 엔진입니다. 번들러는 소스 파일 수천 개를 실행 가능한 파일로 묶는 빌드 도구이고, 엔진은 그 결과물을 기기에서 실행하는 런타임입니다. 서로 대체재가 아니라 파이프라인의 앞뒤입니다.

```
소스 (JS/JSX/TS/Flow)
   │  번들러: Metro | webpack(Rspack) | esbuild 중 하나
   ▼
번들 (하나 또는 여러 개의 JS 파일)
   │  엔진용 컴파일러: hermesc (선택)
   ▼
HBC 바이트코드
   │  엔진: Hermes | JSC | V8
   ▼
실행
```

이 층 분리는 이 실험에서 직접 증명됩니다. Metro 가 만든 번들과 Rspack 이 만든 번들을 같은 hermesc 에 넣으면 둘 다 HBC 가 나옵니다. 엔진은 누가 묶었는지 모릅니다.

같은 소스로 웹 앱 하나와 RN 앱 하나를 만들어 각 도구로 빌드하고 측정했습니다. 웹 앱은 브라우저 대신 jsdom 헤드리스로 실제 렌더까지 검증했습니다.

## 실측: 웹 앱 (React + lodash-es + 동적 import)

| | webpack 5 | esbuild |
|---|---|---|
| 콜드 빌드 (3회) | 1.58~2.06초 | 0.17~0.18초 |
| 초기 번들 | 145,846 bytes | 135,466 bytes |
| 트리 셰이킹 | 안 쓴 lodash 함수 0건 | 동일 |
| 코드 스플리팅 | 동적 import 별도 청크 | 동일 (ESM splitting) |
| 헤드리스 렌더 | 성공 | 성공 |

숫자에 npm 스크립트 기동 오버헤드(약 0.15초)가 포함돼 있으므로 esbuild 의 실제 작업 시간은 수십 ms 입니다. 앱이 커지면 격차는 더 벌어집니다. webpack 이 느린 이유의 큰 몫은 JSX/TS 를 babel-loader 같은 외부 로더에 맡기는 구조이고, esbuild 는 Go 로 짠 파서와 병렬 처리로 그 단계 자체가 없습니다.

크기와 셰이킹 품질은 사실상 같습니다. 2026년 기준으로 "webpack 이 더 작게 만든다" 같은 차이는 이 규모에서는 없습니다. 차이는 속도와 생태계입니다.

## 실측: RN 앱 (같은 화면을 세 도구로)

| | Metro | Re.Pack(Rspack) | esbuild (raw) |
|---|---|---|---|
| 콜드 빌드 | 6.4~7.6초 | 3.8~4.2초 | 실패 |
| 웜 빌드 (캐시) | 1.2~1.4초 | 3.8~4.2초 | - |
| 번들 크기 | 905,528 bytes | 836,382 bytes | - |

esbuild 가 실패하는 지점이 중요합니다. JSX 를 켜 줘도 react-native 패키지의 첫 파일에서 막힙니다.

```
✘ [ERROR] Unexpected "typeof"
    react-native/index.js:15:7:
      15 │ import typeof ActionSheetIOS from './Libraries/...
```

RN 코어가 Flow 타입 문법으로 쓰여 있고, esbuild 는 Flow 를 파싱하지 않기 때문입니다. Metro 는 babel 변환기에 Flow 제거가 기본으로 들어 있고, Re.Pack 은 getJsTransformRules 가 같은 일을 합니다. esbuild 로 RN 을 번들하려면 Flow 를 벗기는 사전 단계를 직접 조립해야 하는데, 그 조립을 해서 내놓은 것이 06번에서 본 granite 의 mpack 입니다(1200개 모듈을 양 플랫폼 합쳐 1~5초). "esbuild 가 RN 을 못 묶는다"가 아니라 "그대로는 못 묶고, 묶게 만든 프레임워크가 이미 있다"가 정확합니다.

Metro 와 Rspack 의 관계는 콜드와 웜이 갈립니다. 콜드는 Rspack 이 빠르고, Metro 는 변환 캐시가 쌓인 뒤(웜)에는 1초대로 더 빠릅니다. 개발 중 반복 빌드가 잦다면 Metro 의 캐시 전략이 실제 체감을 좌우하고, CI 처럼 매번 콜드라면 Rspack 이 유리합니다.

## 각 도구가 존재하는 이유

**Metro** 는 RN 을 위해 만들어졌습니다. 플랫폼 확장자(.android.js / .ios.js), Flow 제거, 에셋 해석, Fast Refresh 가 기본값이라 설정 없이 돌아갑니다. 대신 출력이 단일 번들 하나라는 전제가 깊게 박혀 있어서, 원격 코드 스플리팅과 Module Federation 이 없습니다. 03번에서 확인한 "번들마다 프레임워크 중복" 문제를 Metro 안에서는 풀 수 없다는 뜻이고, 그게 05번에서 번들러를 갈아탄 이유였습니다.

**webpack** 은 웹 생태계의 범용 번들러입니다. 로더와 플러그인으로 무엇이든 끼울 수 있고, Module Federation 의 원조입니다. 유연함의 값이 느린 속도와 설정 복잡도였는데, Rust 로 다시 쓴 호환 구현이 Rspack 이고 Re.Pack 5 가 그걸 씁니다. 05번의 host/feature 분리는 정확히 "webpack 생태계의 기능(MF)을 RN 에 가져온 것"입니다.

**esbuild** 는 속도가 존재 이유입니다. Go 로 짜서 병렬로 돌고, TS/JSX 파서가 내장이라 로더 체인이 없습니다. 웹에서는 그대로 쓸 수 있지만 변환 파이프라인을 세밀하게 끼우는 자리(babel 플러그인 계층)가 없어서, RN 처럼 특수한 변환이 필요한 곳에서는 granite/mpack 처럼 감싸는 층이 필요합니다.

**Hermes** 는 층이 다릅니다. 위 셋 중 무엇으로 묶었든 그 결과물을 받아 실행하는 엔진이고, 핵심 설계는 "파싱과 컴파일을 빌드 타임으로 옮긴다"입니다.

## Hermes: 엔진 층에서 실측한 것

| | 값 |
|---|---|
| hermesc 컴파일 시간 (905KB JS) | 0.65~0.68초 |
| JS (minified) | 905,528 bytes |
| HBC 바이트코드 | 1,329,488 bytes (1.47배) |
| Rspack 번들도 컴파일되나 | 됩니다. 엔진은 번들러를 모릅니다 |
| HBC 매직 넘버 | `c6 1f bc 03 ...` (JS 텍스트가 아닌 바이너리) |

JSC 나 V8 은 기기에서 JS 텍스트를 받아 파싱, 컴파일한 뒤 실행합니다. 앱을 켤 때마다 반복되는 비용입니다. Hermes 는 그 단계를 hermesc 로 빌드 타임에 끝내고, 기기는 바이트코드를 메모리 매핑해 바로 실행합니다. 앱 시작 시간(TTI)과 메모리에서 이득을 보는 대신 두 가지를 냅니다.

- 파일이 커집니다. 위 실측처럼 바이트코드가 원본 JS 보다 1.5배 안팎 큽니다. 그래도 시작 시간이 이기는 거래라서 RN 기본 엔진이 됐습니다.
- JIT 이 없습니다. 오래 도는 연산 루프의 피크 성능은 V8 JIT 보다 느릴 수 있습니다. UI 앱의 병목은 대부분 시작과 메모리라서 이 거래가 성립합니다.

운영에서 중요한 제약이 하나 더 있습니다. HBC 는 바이트코드 버전이 엔진과 정확히 맞아야 합니다(hermesc 와 libhermes 가 같은 RN 릴리스에서 나와야 함). 05~07번처럼 번들을 원격 배포하는 구조에서 JS 로 배포하면 엔진이 기기에서 파싱해 주지만, HBC 로 배포하려면 "이 앱 버전의 엔진에 맞는 HBC" 관리가 배포 파이프라인에 추가됩니다. granite 가 빌드에서 .hbc 를 함께 뽑는 것(06번), CodePush 류가 JS 배포를 기본으로 하는 것 모두 이 제약과 관련이 있습니다.

01번 EXPLAINER 에서 다룬 내용과 이어집니다. hermesc(맥의 빌드 도구)와 libhermes.so(기기의 엔진)가 별개 물건이라는 것, APK 를 까면 JS 가 아니라 HBC 가 나온다는 것이 여기서 실측으로 연결됩니다.

## 고르는 기준

- 표준 RN 앱, 특별한 요구 없음: Metro. 기본값이고, 캐시 웜 빌드가 가장 빠르고, 생태계 문서가 전부 이 전제입니다.
- host / feature 분리, 원격 코드, MF: Re.Pack(Rspack). 05번이 이 경우입니다. Metro 로는 안 됩니다.
- 웹 프로젝트: esbuild 를 직접 쓰거나, esbuild 를 속에 품은 상위 도구(Vite 등). webpack 은 이미 깔린 설정과 특수 로더가 있는 곳에서 유지하는 쪽에 가깝습니다.
- RN 에서 esbuild 급 빌드 속도: 직접 조립하지 말고 granite(mpack) 같은 기성품. 06번이 이 경우입니다.
- Hermes: 번들러와 무관하게 기본으로 켭니다. 끌 이유는 V8 계열이 꼭 필요한 특수한 연산 워크로드 정도이고, 01번에서 JSC 로 바꿔 빌드했을 때의 차이를 확인했습니다.

## 재현 방법

```bash
# 웹: webpack vs esbuild
cd web-app && npm install
npm run build:webpack   # dist-webpack/
npm run build:esbuild   # dist-esbuild/
npm run smoke           # jsdom 헤드리스 렌더 검증

# RN: Metro vs Rspack (node_modules 는 05 host 것을 심링크로 공유)
cd ../rn-app/metro-variant && npm run bundle:android
cd ../repack-variant && npm run bundle:android

# esbuild 로 RN 을 그대로 묶으면 Flow 에서 막히는 것 확인
cd .. && npx esbuild metro-variant/index.js --bundle --loader:.js=jsx \
  --main-fields=react-native,browser,module,main

# Hermes 바이트코드 컴파일
HERMESC=../../05-repack-federation/host/node_modules/react-native/sdks/hermesc/osx-bin/hermesc
$HERMESC -emit-binary -O -out metro-variant/build/index.android.hbc \
  metro-variant/build/index.android.bundle
```

## 한계

- 빌드 시간에 npm 기동 오버헤드가 포함돼 있고, 머신(M 시리즈 맥) 로컬 값입니다. 절대값보다 배율을 봐야 합니다.
- 두 앱 모두 작습니다. 수천 모듈 규모에서는 격차가 훨씬 벌어지는 방향(esbuild, Rspack 유리)으로 움직입니다.
- 웹 앱 검증은 jsdom 헤드리스라 실제 브라우저 렌더링 계층(레이아웃, 페인트)은 다루지 않습니다.
- Hermes 의 시작 시간 이득 자체는 여기서 재지 않았습니다. 01번에서 Hermes 와 JSC 를 실제 빌드로 바꿔 확인했고, 여기서는 산출물과 파이프라인 구조를 다뤘습니다.
