# AAR 에 담겨 소비 앱의 R8 설정에 자동으로 합쳐지는 규칙입니다.
#
# 소비 앱은 이 SDK 안에 무엇이 리플렉션으로 쓰이는지 알 수 없습니다.
# 라이브러리가 스스로 밝혀야 하는 부분이고, 이게 SDK 로 뺄 때 늘어나는 책임 중 하나입니다.

# ReactPackage 와 네이티브 모듈은 이름으로 찾습니다.
-keep class com.example.rnsdk.internal.** { *; }
-keep class com.example.rnsdk.RnSdk { *; }
-keep class com.example.rnsdk.RnSdk$* { *; }
