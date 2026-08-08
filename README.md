# rn-brownfield-lab

기존 네이티브 앱에 React Native를 얹고, 그걸 실제로 배포하기까지 필요한 것들을 직접 돌려보는 저장소입니다.

## 다루는 범위

1. **통합** 브라운필드 방식으로 네이티브 앱에 RN을 붙이는 구조
2. **런타임과 빌드** New Architecture, Hermes, 번들러(Metro, webpack, esbuild)
3. **배포** OTA, 카나리, 블루그린

## 디렉토리

```
experiments/
  01-brownfield/    네이티브 앱(Kotlin, Swift)에 RN 화면을 얹은 최소 구성
  02-rn-as-sdk/     RN 을 배포 가능한 SDK 로 빼고, 그걸 쓰는 앱을 따로 둔 구성
  03-webview-vs-rn/ 같은 화면을 웹뷰와 RN 으로 만들어 나란히 측정
  04-new-architecture/ 구아키텍처와 신아키텍처를 같은 앱에서 비교
  05-repack-federation/ Re.Pack 으로 번들을 host 와 feature 로 나눠 원격 로드
  06-granite/       Toss granite 적용, 05 와의 차이 정리
  07-deployment/    원격 번들의 카나리, 블루그린 배포와 롤백
  08-bundlers-hermes/ Metro, webpack, esbuild 실측 비교와 Hermes 의 층 구분
```

## 실험

| | 내용 | 상태 |
|---|---|---|
| [01-brownfield](experiments/01-brownfield) | 진입점 구조, 인스턴스 공유, 네이티브 통신, APK 크기 | 에뮬레이터/시뮬레이터 실행 검증 완료 |
| [02-rn-as-sdk](experiments/02-rn-as-sdk) | RN 을 AAR 과 XCFramework 로 빼서 배포. 소비 앱은 Node 없이 사용 | 양쪽 실행 검증 완료 |
| [03-webview-vs-rn](experiments/03-webview-vs-rn) | 같은 화면을 웹뷰와 RN 으로 만들어 진입 시간, 앱 용량, 코드량 비교 | Android, iOS 측정 완료 |
| [04-new-architecture](experiments/04-new-architecture) | 같은 앱을 아키텍처 플래그만 바꿔 두 번 빌드해 비교. ReactHost 와 Surface | Android 측정 완료 |
| [05-repack-federation](experiments/05-repack-federation) | Module Federation 으로 host / feature 분리. 멀티 피처, 실패 처리, 재시도까지 | Android, iOS 검증 완료 |
| [06-granite](experiments/06-granite) | Toss granite 적용. 셸과 공유 번들 구조, Re.Pack 직접 조립과의 비교 | Android 에뮬레이터 검증 완료 |
| [07-deployment](experiments/07-deployment) | 카나리와 블루그린. 배포 상태 파일, 결정적 버킷, 전환과 롤백 | Android 에뮬레이터 검증 완료 |
| [08-bundlers-hermes](experiments/08-bundlers-hermes) | 같은 앱을 webpack, esbuild, Metro, Rspack 으로 빌드해 실측. Hermes 는 엔진 층 | 웹 헤드리스, 번들 실측 완료 |

동작 원리 정리는 [01-brownfield/EXPLAINER.md](experiments/01-brownfield/EXPLAINER.md) 에
있습니다. 바이트코드와 네이티브 바이너리의 차이, Hermes 의 컴파일러와 엔진 구분,
브리지가 주고받는 것, 인스턴스 수명, OTA 와 스토어 정책을 다룹니다.

## 기록 규칙

- 측정치는 기기, OS 버전, RN 버전, 측정 방법을 함께 남깁니다. 수치만 있으면 나중에 비교가 안 됩니다.
- 측정하지 않은 것은 적지 않습니다. 조건을 좁혀서 잰 값이면 그 조건을 문장으로 밝힙니다.
- 버전이 빠르게 바뀌는 영역이라 문서 상단에 최종 확인일을 적습니다.
