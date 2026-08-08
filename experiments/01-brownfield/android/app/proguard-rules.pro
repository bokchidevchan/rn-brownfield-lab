# 이 예제는 minifyEnabled false 라 실제로 적용되지 않습니다.
# 실제 앱에서 R8 을 켤 때 RN 쪽으로 필요한 최소 규칙만 적어 둡니다.

# ReactPackage 구현체는 리플렉션으로 잡히는 경우가 있어 이름을 남깁니다.
-keep class com.example.brownfield.rn.** { *; }

# RN 자체 규칙은 node_modules/react-native/ReactAndroid 의 consumer proguard 파일이
# 자동으로 들어옵니다. 여기서 다시 적을 필요 없습니다.
