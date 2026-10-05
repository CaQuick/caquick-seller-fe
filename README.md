<p align="center"><img src="./.github/assets/logo.png" alt="CaQuick" width="120" /></p>

# caquick-seller-fe

케이퀵(CaQuick) 판매자 앱 "케이퀵 판매자"입니다. Expo(React Native) 앱으로, 백엔드([caquick-be](https://github.com/CaQuick/caquick-be))의 판매자 GraphQL·REST API를 사용해 주문·상품·채팅·매장 운영을 한 곳에서 처리합니다. App Store와 Google Play 출시를 목표로 하며, 스토어 계정이 준비되기 전까지는 시뮬레이터 빌드와 APK로 검증합니다.

## 스택

- Expo SDK 57(CNG + expo-dev-client, New Architecture) · Expo Router · TypeScript
- TanStack Query · fetch 래퍼 · graphql-ws · graphql-codegen(client-preset)
- NativeWind v4(Tailwind 3.4) · 디자인 토큰 1벌 · Pretendard
- zustand · expo-secure-store · react-hook-form + zod
- Jest(jest-expo) · Testing Library(React Native) · MSW
- EAS Build(맥미니 로컬) · EAS Submit · EAS Update(OTA)

## 시작하기

```bash
corepack enable
pnpm install
pnpm start           # Metro(localhost:8081). 끝나면 종료합니다
```

### 환경 변수

`EXPO_PUBLIC_*`만 앱 번들에 들어가며, 비밀값은 앱에 넣지 않습니다.

| 이름                       | 내용                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` | 백엔드 오리진(http/https). `/graphql`·`/auth`가 뒤에 붙습니다 |
| `EXPO_PUBLIC_WS_URL`       | GraphQL 구독 주소(ws/wss)                                     |

`.env.development`(로컬 백엔드 `localhost:4100`)와 `.env.production`은 비밀값이 없어 커밋합니다. 값이 잘못되면 `src/shared/config/env.ts`가 부팅 시점에 던집니다.

### 맥북 시뮬레이터로 개발하기

코드와 Metro는 맥미니에서 돌리고, 앱은 맥북의 iOS 시뮬레이터에서 띄웁니다.

1. 맥미니에서 백엔드를 `PORT=4100 yarn start:dev`로 띄우고(필요하면 worker도), 이 레포에서 `pnpm start`를 실행합니다.
2. 맥북에서 포트를 포워딩합니다: `ssh -N -L 8081:127.0.0.1:8081 -L 4100:127.0.0.1:4100 mini`
3. EAS 클라우드로 받은 dev client `.app`을 시뮬레이터에 설치합니다(`development` 프로필, iOS 시뮬레이터 빌드).
4. dev client에서 `http://localhost:8081`을 입력하면 `.env.development`의 주소로 로컬 백엔드에 붙습니다.
5. 세션이 끝나면 Metro와 nest watch를 종료합니다. 맥미니는 운영 호스트입니다.

## 명령어

| 명령                          | 내용                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm validate`               | lint → typecheck → codegen:check → knip → test:cov → expo-doctor → expo export. pre-push 훅과 동일합니다     |
| `pnpm test` / `pnpm test:cov` | Jest(jest-expo). 네트워크는 MSW가 흉내 냅니다                                                                |
| `pnpm lint` / `pnpm format`   | typed routes 선언을 만든 뒤 ESLint(경계 규칙 포함) / Prettier                                                |
| `pnpm typecheck`              | typed routes 선언을 만든 뒤 `tsc --noEmit`                                                                   |
| `pnpm schema:pull [ref]`      | 백엔드 SDL 스냅샷(`schema/schema.graphql`) 갱신. 기본 `develop`, `BE_DIR=../caquick-be`로 로컬 체크아웃 사용 |
| `pnpm codegen`                | 스냅샷 + 문서 → `src/graphql/generated`(커밋 대상)                                                           |
| `pnpm export`                 | Metro 번들이 두 플랫폼에서 만들어지는지 확인합니다                                                           |

## 배포

`main`에 머지되면 CI가 성공한 뒤 맥미니 셀프호스트 러너(`macmini-seller`)가 `release.yml`을 실행합니다.

1. 플랫폼별 `eas fingerprint:generate`로 네이티브 변경 여부를 판별합니다.
2. fingerprint가 새것이면 `eas build --local`로 빌드하고, 스토어 시크릿이 있으면 `eas submit`으로 TestFlight·Play 내부 테스트에 올립니다. 시크릿이 없으면 iOS 시뮬레이터 빌드와 Android APK/AAB를 아티팩트로만 남깁니다.
3. `eas update --channel production`으로 OTA를 발행합니다. fingerprint가 바뀐 플랫폼은 빌드가 성공한 뒤에만 발행합니다.

로컬 빌드는 EAS 대시보드에 남지 않으므로 git 태그 `shipped/<platform>/<hash>`(제출 완료)·`built/<platform>/<hash>`(아티팩트만)가 "이 fingerprint로 빌드가 나갔는가"의 유일한 원장입니다. 이 태그는 삭제하지 않습니다. fingerprint 계산과 production 채널 발행은 호스트에 따라 값이 달라질 수 있어 맥미니에서만 합니다. 롤백은 `release.yml`을 수동 실행하며 `republish_group`에 이전 update group ID를 넣습니다. 호스트 준비와 시크릿 표는 [infra/README.md](./infra/README.md)에 있습니다.

## 문서

- [docs/guide/architecture-conventions.md](./docs/guide/architecture-conventions.md): 구조·의존 방향·데이터·인증·UI·테스트·운영 호스트 규칙
- [docs/guide/decisions.md](./docs/guide/decisions.md): 확정된 결정과 이유

## 라이선스

[Apache-2.0](./LICENSE)
