#!/bin/bash
#
# RnSdk.xcframework 를 만듭니다.
#
# Android 는 AAR 하나면 끝났는데 iOS 는 산출물이 둘입니다.
#   RnSdk.xcframework    우리 코드 + React pod 들을 정적으로 흡수한 동적 프레임워크
#   hermes.xcframework   RN 이 미리 빌드해 배포하는 동적 프레임워크. 흡수할 수 없습니다
#
# hermes 를 흡수하지 못하는 이유는 그것이 이미 동적 프레임워크로 배포되기 때문입니다.
#   Pods/hermes-engine/.../hermes.framework/hermes:
#     Mach-O 64-bit dynamically linked shared library
# 정적 라이브러리 병합(libtool)은 .a 만 다룰 수 있고 동적 프레임워크는 못 넣습니다.
#
# 실행: cd ios && ./scripts/build_xcframework.sh
#
set -euo pipefail

IOS_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ios/build 를 쓰면 안 됩니다. 거기는 pod install 이 만든 codegen 산출물 자리입니다.
#   ios/build/generated/ios/FBReactNativeSpec/FBReactNativeSpec.h
# 지우면 ReactCodegen 타깃이 헤더를 못 찾고 아카이브가 실패합니다.
BUILD_DIR="$IOS_DIR/.xcbuild"
OUT_DIR="$IOS_DIR/dist"
NAME="RnSdkKit"

rm -rf "$BUILD_DIR" "$OUT_DIR"
mkdir -p "$OUT_DIR"

archive() {
  local sdk="$1" name="$2"
  echo "==> $name 아카이브"
  xcodebuild archive \
    -workspace "$IOS_DIR/$NAME.xcworkspace" \
    -scheme "$NAME" \
    -configuration Release \
    -destination "$sdk" \
    -archivePath "$BUILD_DIR/$name.xcarchive" \
    SKIP_INSTALL=NO \
    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
    CODE_SIGNING_ALLOWED=NO \
    | tail -3
}

archive "generic/platform=iOS Simulator" "simulator"
archive "generic/platform=iOS" "device"

echo "==> XCFramework 생성"
xcodebuild -create-xcframework \
  -framework "$BUILD_DIR/simulator.xcarchive/Products/Library/Frameworks/$NAME.framework" \
  -framework "$BUILD_DIR/device.xcarchive/Products/Library/Frameworks/$NAME.framework" \
  -output "$OUT_DIR/$NAME.xcframework"

echo "==> hermes.xcframework 복사"
# 소비 앱은 node_modules 가 없으므로 SDK 가 같이 배포해야 합니다.
# 경로가 Pods/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework 라
# 깊습니다. maxdepth 를 넉넉히 잡습니다.
HERMES=$(find "$IOS_DIR/Pods/hermes-engine" -maxdepth 8 -name "hermes.xcframework" | head -1)
if [ -z "$HERMES" ]; then
  echo "hermes.xcframework 를 찾지 못했습니다. pod install 을 먼저 돌리세요." >&2
  exit 1
fi
cp -R "$HERMES" "$OUT_DIR/"

echo
echo "완료. 배포할 산출물:"
ls -1 "$OUT_DIR"
