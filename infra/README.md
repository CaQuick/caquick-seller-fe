# infra — 맥미니 릴리즈 호스트

판매자 앱은 서버가 없다. `main` 머지마다 맥미니(셀프호스트 러너 `macmini-seller`)가 `eas build --local`로 네이티브를 빌드하고, 스토어 계정이 있으면 `eas submit`, 그리고 `eas update`(OTA)를 발행한다. PR 검사(`CI`)는 GitHub ubuntu 러너에서 돈다.

## 흐름

`main` push → `CI` 성공 → `Release`(`.github/workflows/release.yml`, Environment `production`) 단일 잡:

1. 호스트 락(`scripts/host-lock.mjs`, `127.0.0.1:47391`) — BE jest와 같은 포트라 둘 중 하나만 호스트를 쓴다.
2. `pnpm install` → 도구 점검(`eas whoami`, 플랫폼별 Xcode·pod·fastlane / JDK·sdkmanager).
3. 플랫폼별 `eas fingerprint:generate` → 원장 태그가 있으면 OTA만, 없으면(또는 `force_build`) 빌드.
4. 빌드: iOS는 `production`(ipa, Apple 원격 credentials, `IOS_STORE_READY=true`일 때) 또는 `production-simulator`(tar.gz). Android는 `production`(AAB, 자체 keystore) + 제출 전엔 `production-apk`.
5. 시크릿이 있으면 `eas submit --path`(TestFlight · Play 내부 테스트).
6. 원장 태그 push → `eas update --channel production --platform <p>` + `runtimeVersion == fingerprint` 검증 → 아티팩트 업로드(14일) → 시크릿 삭제 → 락 해제 → Discord.

**원장 태그**(`shipped/<platform>/<hash>` 제출까지 성공, `built/<platform>/<hash>` 아티팩트만)는 로컬 빌드의 유일한 기록이다 — EAS 대시보드에 남지 않는다. **태그를 지우지 않는다.** 지우면 다음 머지에서 같은 fingerprint를 다시 빌드한다(무해하지만 시간 낭비).

fingerprint 계산과 `eas update --channel production`은 **이 호스트에서만** 한다. 개발 머신·ubuntu에서 발행하면 해시가 달라 기존 바이너리가 업데이트를 영영 못 받을 수 있다. `preview` 채널은 자유.

## 새 호스트 준비(1회)

디스크 약 35~40 GB(Xcode·시뮬레이터 런타임·Android SDK/NDK·캐시).

### 1. Xcode(사용자, Apple ID 필요)

SDK 57은 Xcode 26.4 이상. App Store 또는 developer.apple.com에서 설치한 뒤:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
xcodebuild -downloadPlatform iOS      # 시뮬레이터 런타임 약 8.5 GB
xcodebuild -version
```

Xcode 전에는 `workflow_dispatch(platform=android)`만 돈다 — 도구 점검이 플랫폼별이라 iOS 도구가 없어도 Android 빌드는 막히지 않는다.

### 2. brew 도구

```bash
brew install openjdk@17                     # zulu@17 cask는 pkg 설치에 sudo 비밀번호가 필요해 무인 설치가 안 된다
brew install --cask android-commandlinetools
brew install cocoapods fastlane watchman    # iOS 로컬 빌드는 시뮬레이터 프로필도 fastlane(gym)·CocoaPods가 필요하다
npm install -g eas-cli                      # expo-doctor가 레포 devDependency를 막아 전역으로 둔다(npm 전역 prefix가 /opt/homebrew라 /opt/homebrew/bin/eas)
```

### 3. Android SDK

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006" "cmake;3.22.1" "cmdline-tools;latest"
```

RN 0.86 템플릿 기준(compileSdk 36, NDK 27.1). New Architecture의 `libappmodules.so` 컴파일에 NDK·CMake가 필요하다.

### 4. 러너 등록(`macmini-seller`)

BE 러너 tarball을 재사용한다(`~/actions-runner/actions-runner-osx-arm64-2.337.0.tar.gz`). 디렉터리는 다른 러너와 분리한다.

```bash
mkdir -p ~/actions-runner-seller && cd ~/actions-runner-seller
tar xzf ~/actions-runner/actions-runner-osx-arm64-2.337.0.tar.gz
token=$(gh api -X POST repos/CaQuick/caquick-seller-fe/actions/runners/registration-token --jq .token)
./config.sh --url https://github.com/CaQuick/caquick-seller-fe --token "$token" \
  --name macmini-seller --labels macmini-seller --work _work --unattended --replace
```

러너가 시작 시 읽는 환경(`.env`·`.path`) — 잡은 로그인 셸을 거치지 않으므로 여기 없으면 `java`·`sdkmanager`·`pod`를 못 찾는다:

```bash
cat > .env <<'EOF'
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
ANDROID_HOME=/Users/cha/Library/Android/sdk
ANDROID_SDK_ROOT=/Users/cha/Library/Android/sdk
LANG=en_US.UTF-8
EOF
echo "/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/Users/cha/Library/Android/sdk/platform-tools:/Users/cha/Library/Android/sdk/cmdline-tools/latest/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" > .path
./svc.sh install && ./svc.sh start      # LaunchAgent(SessionCreate) — 기존 두 러너와 같은 방식
```

`config.sh`가 만드는 `.path`에는 실행한 셸의 임시 경로가 섞이므로 위 `echo`로 반드시 덮어쓴다. brew cask가 `sdkmanager`를 `/opt/homebrew/bin`에도 링크해 맨 이름은 cask 쪽 버전으로 잡히지만, 워크플로는 `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager` 절대경로를 쓰고 Gradle은 `ANDROID_HOME`을 보므로 영향이 없다.

`svc.sh install`이 자동 모드에서 막히면 사용자가 직접 한 번 실행한다. 등록 확인: `gh api repos/CaQuick/caquick-seller-fe/actions/runners --jq '.runners[] | {name, status, labels: [.labels[].name]}'`.

### 5. Android 업로드 keystore

스토어 계정 전에도 Android는 자체 keystore로 서명한다. 이 키가 나중에 **Play 업로드 키**가 되므로 분실하면 안 된다.

```bash
mkdir -p ~/caquick-secrets/seller && chmod 700 ~/caquick-secrets/seller && cd ~/caquick-secrets/seller
export ANDROID_KEYSTORE_PASSWORD=$(openssl rand -base64 24) ANDROID_KEY_PASSWORD=$(openssl rand -base64 24)
keytool -genkey -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass:env ANDROID_KEYSTORE_PASSWORD -keypass:env ANDROID_KEY_PASSWORD -alias caquick-seller -keystore release.keystore \
  -dname "CN=com.caquick.seller,O=CaQuick,C=KR"
printf 'ANDROID_KEYSTORE_PASSWORD=%s\nANDROID_KEY_ALIAS=caquick-seller\nANDROID_KEY_PASSWORD=%s\n' \
  "$ANDROID_KEYSTORE_PASSWORD" "$ANDROID_KEY_PASSWORD" > android-keystore.env
chmod 600 android-keystore.env release.keystore
# 비밀값은 명령줄 인자 대신 stdin으로 넘긴다(프로세스 목록·셸 기록에 남지 않게)
gh api -X PUT repos/CaQuick/caquick-seller-fe/environments/production >/dev/null   # 없으면 secret set -e가 404
base64 < release.keystore | gh secret set ANDROID_KEYSTORE_BASE64 -R CaQuick/caquick-seller-fe -e production
printf %s "$ANDROID_KEYSTORE_PASSWORD" | gh secret set ANDROID_KEYSTORE_PASSWORD -R CaQuick/caquick-seller-fe -e production
printf %s caquick-seller | gh secret set ANDROID_KEY_ALIAS -R CaQuick/caquick-seller-fe -e production
printf %s "$ANDROID_KEY_PASSWORD" | gh secret set ANDROID_KEY_PASSWORD -R CaQuick/caquick-seller-fe -e production
unset ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD
```

잡은 시크릿을 `.secrets/release.keystore` + `credentials.json`으로 복원하고(`credentialsSource: local`) 끝나면 지운다. 레포의 `.gitignore`가 `*.keystore`·`credentials.json`·`.secrets/`를 막는다.

### 6. Expo

조직 `caquick`의 robot user 토큰을 `EXPO_TOKEN`으로 등록한다(`gh secret set EXPO_TOKEN -R CaQuick/caquick-seller-fe -e production`). 토큰이 생기면 `eas init`(app.config.ts의 `extra.eas.projectId`·`updates.url` TODO 채움) → `eas update:configure` → `eas channel:create production`·`preview`·`development`. 로컬 빌드는 EAS Secret 가시성 환경변수를 못 읽으므로 비밀값은 전부 GitHub Environment에 둔다.

## 시크릿·변수(Environment `production`)

| 이름                                                             | 종류        | 필수         | 없을 때                                        |
| ---------------------------------------------------------------- | ----------- | ------------ | ---------------------------------------------- |
| `EXPO_TOKEN`                                                     | secret      | 필수         | 잡 실패(도구 점검의 `eas whoami`)              |
| `ANDROID_KEYSTORE_BASE64` · `ANDROID_KEYSTORE_PASSWORD`          | secret      | Android 빌드 | Android 빌드 단계 실패                         |
| `ANDROID_KEY_ALIAS` · `ANDROID_KEY_PASSWORD`                     | secret      | Android 빌드 | 동일                                           |
| `ASC_API_KEY_P8_BASE64` · `ASC_API_KEY_ID` · `ASC_API_ISSUER_ID` | secret      | 선택         | iOS submit 건너뜀, 원장은 `built/`             |
| `ASC_APP_ID`                                                     | variable    | 선택         | iOS submit 건너뜀                              |
| `IOS_STORE_READY`                                                | variable    | 선택         | `true`가 아니면 `production-simulator`(tar.gz) |
| `PLAY_SERVICE_ACCOUNT_JSON_BASE64`                               | secret      | 선택         | Android submit 건너뜀, 원장은 `built/`         |
| `DISCORD_WEBHOOK_URL`                                            | secret      | 선택         | 알림 생략                                      |
| `CODECOV_TOKEN`                                                  | repo secret | 선택         | CI 업로드 생략                                 |

`ASC_API_KEY_ID`·`ASC_API_ISSUER_ID`·`ASC_APP_ID`는 `eas.json`의 `submit.production.ios`에도 적어야 한다(지금은 `TODO_*`). 시크릿이 생기면 다음 main 머지(또는 `force_build`)에서 `shipped/` 원장이 비어 있어 스토어 빌드+제출이 한 번 자동으로 돈다.

## 첫 빌드

Actions → `Release` → Run workflow: `platform=android`, `force_build=true`, `submit=auto`. 콜드 빌드는 Gradle·NDK 다운로드 포함 15~25분으로 추정한다(M1 16 GB) — 실측 시간을 여기 적는다. iOS는 Xcode 설치 뒤 `platform=ios`로 같은 절차. 아티팩트(`seller-<sha>`)의 APK는 실기기에 `adb install`, 시뮬레이터 tar.gz는 풀어서 `xcrun simctl install booted <.app>`.

| 플랫폼  | 콜드 | 웜  |
| ------- | ---- | --- |
| Android | —    | —   |
| iOS     | —    | —   |

## 롤백

- OTA 되돌리기: Release를 `republish_group=<update group ID>`로 실행하면 그 그룹을 재발행하고 종료한다(빌드·OTA 없음). 그룹 ID는 `eas update:list --branch production`.
- 네이티브 내장 번들로: 호스트에서 `eas update:roll-back-to-embedded --channel production --runtime-version <fingerprint> --environment production`.
- 네이티브 자체를 되돌리는 건 스토어 재제출뿐이다 — 이전 커밋으로 `revert` PR → main.

## 운영 호스트 보호

- `concurrency: seller-release`(빌드 잡끼리 직렬) + 호스트 락(BE jest와 직렬) + `nice -n 15` + `GRADLE_OPTS -Dorg.gradle.daemon=false -Dorg.gradle.workers.max=4 -Dorg.gradle.jvmargs=-Xmx3g` + `timeout-minutes: 120`.
- 캐시는 호스트에 남는다(`~/.gradle`, `~/.cocoapods`, `~/Library/Caches/CocoaPods`, `~/Library/Developer/Xcode/DerivedData`, `~/.cache/eas-cli`). 디스크가 차면 DerivedData부터 지운다.
- `eas build --local`은 레포를 임시 디렉터리에 복제해 prebuild한다 — 작업 트리에 `ios/`·`android/`가 남지 않는다.
- 스토어 서명(iOS `production`)으로 전환할 때 launchd 세션의 키체인 접근을 실측한다. 실패하면 잡 안에 전용 키체인 생성 단계를 추가한다(BE GHCR `-25308`과 같은 계열).

## 점검

```bash
gh run list -R CaQuick/caquick-seller-fe -w Release -L 5
git ls-remote --tags https://github.com/CaQuick/caquick-seller-fe 'built/*' 'shipped/*'
lsof -nP -iTCP:47391 -sTCP:LISTEN          # 호스트 락 보유자(없으면 비어 있음)
launchctl list | grep actions.runner        # 러너 3개(be·admin·seller)
```
