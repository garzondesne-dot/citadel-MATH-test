# 📲 교사 앱 APK (안드로이드 TWA · Bubblewrap) — 📜 2026-11-16 선생님 「교사 APK + 알림 진행」

- 앱 = 정식 교사 화면 `https://garzondesne-dot.github.io/Citadel-MATH/?role=teacher` 을 띄우는 껍데기 · 화면 · 기능은 사이트에서 저절로 바뀜
- 다시 만들 일 = 이름 · 아이콘 · 시작 주소 · 패키지를 바꿀 때만 (그때 `appVersionCode` +1)
- 패키지 `io.github.garzondesne_dot.dungeon.teacher` · 이름 「모두의 던전 선생님」 · minSdk 24(안드로이드 7+)
- 🔑 서명 키 = 저장소 금지 · 손발 비공개 폴더(scratchpad/key/apk) + 선생님 드라이브 비공개 폴더 「던전선생님_APK_서명키_비공개.tgz」 · **키를 잃으면 같은 앱으로 업데이트 못 함**
- 주소창 숨기기 = `garzondesne-dot/garzondesne-dot.github.io` 저장소의 `.well-known/assetlinks.json` (서명 지문 SHA-256 = 공개값 · 키를 바꾸면 같이)

## 만드는 순서 (이 환경 · dl.google.com 허용 필요)
1. JDK 17 (`apt-get install -y openjdk-17-jdk-headless`) · Android SDK cmdline-tools → `sdkmanager "build-tools;34.0.0" "platforms;android-35" "platform-tools"`
2. `~/.bubblewrap/config.json` = { jdkPath, androidSdkPath } · `npm i @bubblewrap/cli@1.27.0`
3. 아이콘을 localhost 로 (github.io 는 이 환경에서 막힘): `cd public && python3 -m http.server 4180`
4. 이 폴더 `twa-manifest.json` 을 작업 폴더에 복사(signingKey.path 고침) → `bubblewrap update --skipVersionUpgrade < /dev/null`
5. `build.gradle` 의 `jcenter()` → `maven { url "https://repo.maven.apache.org/maven2" }` (jcenter = 429)
6. `BUBBLEWRAP_KEYSTORE_PASSWORD=… BUBBLEWRAP_KEY_PASSWORD=… bubblewrap build --skipPwaValidation < /dev/null` → `app-release-signed.apk`
7. `apksigner verify --print-certs` 로 지문 확인 → 드라이브 비공개 폴더에 올림
