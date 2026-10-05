# 아키텍처와 컨벤션

케이퀵 판매자 앱의 구조와 규칙입니다. 결정의 배경은 [decisions.md](./decisions.md)에 있습니다. 이 문서는 "왜"를 적고, 도구가 강제하는 것은 도구 이름을 함께 적습니다.

## 1. 큰 그림

```
케이퀵 판매자 앱(iOS·Android, Expo SDK 57)
  ├─ GraphQL·REST ──────────> api.caquick.site (caquick-be)
  ├─ graphql-ws 구독 ───────> wss://api.caquick.site/graphql
  ├─ 이미지 PUT ────────────> S3 presigned URL (BE가 서명)
  ├─ 푸시 수신 <──────────── Expo Push Service <── BE worker
  └─ OTA 번들 <───────────── EAS Update (production 채널)
```

- 앱 1개에 서버 코드가 없습니다. 데이터는 전부 백엔드의 판매자 API에서 오고, 네이티브 코드는 CNG로 빌드 시점에 생성합니다(`ios/`·`android/` 미커밋).
- 백엔드 계약의 정본은 caquick-be의 SDL입니다. 이 레포는 그 스냅샷(`schema/schema.graphql`)을 커밋하고 codegen으로 타입을 만듭니다.
- 역할 분리
  - `app/`: 라우트만. 화면 조립은 feature의 `ui/`가 맡습니다.
  - `src/features/*`: 도메인별 API 문서·상태·화면.
  - `src/shared/*`: 클라이언트·세션·토큰·공용 UI. 도메인을 모릅니다.

## 2. 파일 배치와 의존 방향 (ESLint `boundaries`)

```
app/                       expo-router 파일 라우트. 얇게. spec 금지(typed routes가 빈 router.d.ts를 만드는 버그)
  _layout.tsx              Providers(GestureHandlerRoot·QueryClient·BottomSheetModal·Toaster)·폰트·세션 부팅·Updates
  (auth)/                  login·change-password
  (app)/                   세션 가드 + 루트 Stack
    (tabs)/                홈·주문·상품·채팅·매장 (탭 안에 Stack을 두지 않습니다)
    orders/·products/·chats/·store/·settings/   상세 화면은 루트 Stack에 둡니다
src/
  features/<area>/         auth·home·orders·products·chats·store·reviews·settings·push·uploads
    api/                   graphql() 문서 + 쿼리 키·queryOptions 팩토리
    model/                 zustand 스토어·zod 스키마·순수 로직
    ui/                    화면 조립 컴포넌트와 부품
    index.ts               밖에 내놓는 것만
  shared/
    api/                   config·errors·graphql-client·rest-client·session·ws-client
    ui/                    Button·TextField·Sheet·Screen 같은 공용 부품
    lib/                   kst·format·josa·zod-locale·upload·storage(SecureStore)·cn
    config/                env.ts(EXPO_PUBLIC_*)·tokens.ts(색·간격·반경·자간)
  graphql/generated/       codegen 산출물(커밋)
  test/                    setup·mocks·msw·render·factories
```

- **shared → features 금지.** 공용이 도메인을 알면 공용이 아닙니다.
- **feature 간 import는 대상 `index.ts`로만.** 내부 경로를 파고들면 lint가 막습니다.
- **`app/`은 얇게.** 파라미터 파싱과 feature `ui/` 호출까지만 하고, 문서·상태를 두지 않습니다. 동적 경로는 문자열이 아니라 `href={{ pathname: '/orders/[id]', params: { id } }}` 객체로 씁니다.
- **탭 안에 중첩 Stack을 두지 않습니다.** iOS Release 빌드가 스플래시에서 멈추는 미해결 버그(expo/expo#47687) 때문에 상세 화면은 `(tabs)` 밖 루트 Stack에 둡니다.
- 규칙은 `eslint.config.mjs`의 `boundaries/dependencies`가 강제합니다. 규칙을 고치면 위반 예시로 실제로 걸리는지 확인합니다(현재 코드가 통과한다는 것은 증거가 아닙니다).
- `no-restricted-imports`가 두 가지를 더 막습니다.
  - `@react-native-async-storage/async-storage`: 임시저장 초안(`features/products`) 전용. 토큰·세션은 `expo-secure-store`.
  - `react-native`의 `SafeAreaView`: deprecated라 `react-native-safe-area-context` 훅을 씁니다.

## 3. 데이터 계층

- **문서**는 feature 안 `api/*.ts`에서 `graphql()`(codegen client-preset, `documentMode: string`) 호출로 씁니다. 이름은 `Seller<Area><동사>`(예 `SellerOrdersList`, `SellerUpdateOrderStatus`). `app/`과 스펙 파일의 문서는 codegen 대상이 아닙니다.
- **스키마 스냅샷**은 `schema/schema.graphql`입니다. BE SDL이 바뀌면 `pnpm schema:pull [ref]`(기본 `develop`, `BE_DIR`로 로컬 체크아웃) 뒤 `pnpm codegen`을 돌리고 산출물을 커밋합니다. CI는 `codegen:check`로 신선도만 검사하고, BE와의 drift는 advisory입니다.
- **요청**은 `gqlRequest(Document, variables)`(`@/shared/api`) 하나로. 인증 헤더·`X-Client: mobile`·401 갱신·403 분기·에러 정규화(`ApiError`)를 여기서 끝냅니다. REST는 `authRequest`.
- **쿼리 키**는 feature별 팩토리(`ordersKeys.list(filters)`, `ordersKeys.detail(id)`)로만 만듭니다. 문자열 리터럴 키는 쓰지 않습니다.
- **mutation 뒤**에는 그 feature의 list·detail 키를 invalidate합니다. 낙관적 업데이트는 쓰지 않습니다. 서버 결과가 진실입니다.
  - 예외(D49): 노출 스위치처럼 즉시 피드백이 필요한 토글과 조작마다 바로 저장하는 옵션 편집기는 화면을 먼저 바꾸고, 실패하면 되돌린 뒤 토스트를 띄웁니다. 노출 스위치는 `onMutate`에서 관련 쿼리를 cancel하고 스냅샷을 잡아 캐시를 고치고, `onError`에서 스냅샷으로 되돌리며, `onSettled`에서 invalidate합니다. 옵션 편집기는 요청이 도는 동안 서버 값으로 덮지 않고, 실패하면 캐시의 서버 값으로 되돌립니다.
  - 채팅 전송은 캐시를 미리 고치지 않고 화면 로컬의 '보내는 중' 버블로 보여 준 뒤 응답 메시지로 바꿉니다.
- **구독**은 `subscribe(Document, variables, sink)`(`@/shared/api`)를 feature 훅의 `useEffect`에서 부르고 해제 함수를 그대로 돌려줍니다. shared는 연결·4401 재인증만 맡고, 캐시 갱신과 워터마크 비교는 구독하는 feature의 `model/`에 순수 함수로 둡니다.
  - 주문: `orderId`별 `updatedAt`(`createOrderWatermark` — `orders/model/order-updates.ts`, `home/model/home.ts`).
  - 대화: `(lastMessageAt, sellerLastReadAt)` 사전식(`chats/model/conversation-merge.ts`). 로컬에서 읽음 처리한 뒤 도착한 이벤트의 `unreadCount`는 로컬 `sellerLastReadAt`이 더 크면 0으로 봅니다.
  - 워터마크는 구독 인스턴스마다 새로 만들고 feature끼리 공유하지 않습니다. 같은 `sellerOrderUpdated`를 홈·주문 목록·전역 새 주문 알림이 각자 구독합니다.
- **RN 배선**: `onlineManager`는 네트워크 상태, `focusManager`는 AppState, 화면 포커스 refetch는 `useFocusEffect`로 잇습니다.
- **목록**은 커서 방식(`items · totalCount · hasMore · nextCursor`)이 기본이고 무한 스크롤로 이어 붙입니다. 필터는 화면 상태(zustand 또는 로컬 state)에 둡니다.
- **ID**는 문자열 그대로 씁니다. `"0"`·빈 문자열을 truthy 검사로 버리지 않습니다.
- **날짜**는 표시·입력 KST, 전송 ISO(UTC)입니다. `shared/lib/kst.ts`가 UTC+9 산술로 처리하고 `Intl`을 쓰지 않습니다(Hermes의 플랫폼별 편차 회피). 천단위 구분도 자체 `formatNumber`입니다.
- **업로드**(`shared/lib/upload.ts`): manipulate(≤1600px, JPEG 0.85) → `new File(uri).size` → `sellerCreateUploadUrl` → `file.upload(PUT)` → `publicUrl`. presign이 Content-Length를 서명에 넣으므로 축소를 먼저 하고 그 결과의 크기로 presign합니다.
  - shared는 GraphQL 문서를 갖지 않으므로 presign 함수는 feature가 넣습니다: 상품 이미지 `features/uploads`의 `presignUpload`, 매장 로고 store의 `presignStoreImage`. 용도(`purpose`)도 호출한 쪽이 정합니다.
  - 실패는 `ApiError`입니다: 빈 파일·5MB 초과는 `BAD_USER_INPUT`, PUT 연결 실패는 `NETWORK`, PUT 비2xx는 그 status를 담은 `INTERNAL_SERVER_ERROR`.
  - 여러 장은 장마다 따로 올립니다. 실패한 장만 '다시 올리기'가 뜨고, 초안 이미지는 재시도용 원본(`source`)을 들고 있습니다. 올리는 사이 지운 이미지에는 결과를 반영하지 않습니다.
  - 상품 이미지 상한은 6장(`MAX_IMAGES`, BE `MAX_PRODUCT_IMAGES`와 같음, D46)입니다.
- **여러 mutation을 잇는 저장**은 부분 실패를 전제로 합니다. 호출 하나가 성공할 때마다 진행을 기록하고, 다시 시도하면 끝난 호출을 건너뜁니다.
  - 상품 등록(`runCreateChain`): 숨김 상태로 생성 → 이미지 2장째부터 추가 → 카테고리 → 태그 → 옵션 그룹·아이템 → 노출. 진행(`SubmitProgress`)에 productId·추가한 이미지 수·그룹/아이템 key별 서버 id를 남깁니다. 마지막에 노출하므로 중간에 멈춘 상품은 구매자에게 보이지 않고, 포기하면 만든 상품을 지웁니다(`abandonCreate`).
  - 상품 수정(`pendingSteps`): 정보·카테고리·태그 단계마다 성공한 값을 기준값에 반영하고, 실패하면 남은 차이부터 다시 계산합니다. 토스트에 멈춘 단계를 함께 알립니다.
- **기기 저장 키**는 `caquick.<이름>`입니다: SecureStore `caquick.refreshToken`, AsyncStorage `caquick.productDraft`.
  - 상품 임시저장 초안은 기기 1벌입니다(D30). 저장할 때 업로드가 끝난 이미지의 `publicUrl`만 남기고, 읽을 때 zod로 검증해 모양이 다르면(앱 버전이 바뀐 경우 포함) 버립니다.
  - 초안의 그룹·아이템·이미지 `key`는 `newKey(prefix)`로 만든 클라이언트 값이고, 등록 진행이 이 key로 서버 id를 기억합니다. 등록 중에는 key를 다시 만들지 않고, 초안을 복원하면 진행은 비웁니다. 서버 데이터를 고치는 화면(옵션 편집)은 서버 id를 key로 씁니다.

## 4. 인증

- 로그인·갱신·로그아웃·비밀번호 변경은 REST(`/auth/seller/*`)이고 나머지는 GraphQL입니다.
- 모든 요청에 `X-Client: mobile`을 보내고 쿠키는 쓰지 않습니다. 로그인 응답 바디의 `refreshToken`은 SecureStore 키 `caquick.refreshToken`에만 저장하고, accessToken은 메모리(zustand)에만 둡니다.
- **세션 부팅**(`features/auth/model/session.ts`): SecureStore 읽기 → 없으면 anonymous → 있으면 `refreshOnce()` → 실패면 SecureStore 삭제 + anonymous. iOS는 재설치 뒤에도 키체인이 남아 있어 실패 즉시 지웁니다. `mustChangePassword`는 refresh 응답으로 분기합니다(`sellerMe`는 RolesGuard에 막힙니다).
- **401·`UNAUTHENTICATED`**면 refresh 1회(동시 요청은 하나의 promise를 공유) 후 재시도하고, 실패면 로컬 세션을 지웁니다.
- **403은 코드로 분기**합니다(`session.ts`의 `onForbidden(code)` 훅, 응답당 1회).
  - `PASSWORD_CHANGE_REQUIRED`: 비밀번호 변경 화면으로.
  - `ACCOUNT_NOT_ACTIVE`·`ACCOUNT_TYPE_NOT_ALLOWED`: 로컬 세션 삭제 + 토스트.
- **로그인 성공** 뒤 푸시 토큰을 등록합니다(`sellerRegisterPushToken`). **로그아웃**은 푸시 토큰 해제(best effort) → `/auth/seller/logout` → SecureStore 삭제 → ws dispose → queryClient clear 순서입니다.
- **푸시 토큰**(`features/push`): 권한 팝업은 로그인 직후에만 띄우고, 앱 시작과 설정에서 권한을 켜고 돌아온 때는 묻지 않고 다시 등록합니다(`ensurePushToken`, 겹친 호출은 하나로). EAS `projectId`가 없으면 등록을 건너뛰고 경고 로그만 남깁니다(D48). 해제는 `onBeforeLogout` 콜백입니다.
- **푸시·구독 중복 제거**: 앱이 열려 있으면 같은 사건이 구독과 포그라운드 푸시로 두 번 옵니다. 시스템 배너는 끄고(D39) 인앱 토스트 하나만 띄웁니다.
  - 새 주문: `(app)` 레이아웃의 전역 구독(`useNewOrderNotices`)과 포그라운드 푸시가 모두 `notifyNewOrder(orderId)`를 부르고, 최근 orderId 50개를 기억해 먼저 온 쪽만 토스트를 띄웁니다. 구독이 끊겨 있으면 푸시가 대신 알립니다.
  - 문의: 채팅 탭과 그 대화방에서는 목록·방 구독이 화면을 갱신하므로 푸시 토스트를 띄우지 않습니다(`shouldToastMessage`, 경로 기준).
  - 캐시 무효화는 토스트 여부와 관계없이 푸시마다 합니다(`staleKeysFor`).
- **비밀번호 변경 성공**은 BE가 기존 토큰을 무효화하므로 로그아웃과 같은 로컬 정리를 한 뒤 로그인 화면으로 보냅니다.
- **ws 클라이언트**(`shared/api/ws-client.ts`)는 lazy이며 `connectionParams`가 매 연결마다 새 accessToken을 넣습니다. close 코드 4401·4403이면 refresh를 시도하고, AppState가 active로 돌아오면 `terminate()`로 죽은 소켓을 끊어 재연결을 유도합니다.

## 5. 에러 표시

- `ApiError(message, classification, code, status)`가 유일한 에러 모양입니다. GraphQL은 `errors[0].extensions`에서, REST는 봉투에서 만듭니다.
- REST 봉투는 세 형태를 받습니다.
  - `{ code, message }`: 카탈로그 코드가 있는 도메인 오류.
  - `{ message, data: [{ field, message }] }`: 400 검증 오류. `data[]`를 폼 필드 에러로 매핑합니다.
  - 봉투가 없거나 JSON이 아닌 응답: HTTP status로 분류합니다.
- 카탈로그 코드는 한국어 문구 표(`shared/api/errors.ts`)로 매핑하고, 표에 없으면 백엔드 `message`를 그대로 씁니다. 앱에서 추가된 문구는 `ACCOUNT_NOT_ACTIVE`·`ACCOUNT_TYPE_NOT_ALLOWED`·`LOGIN_RATE_LIMITED`입니다.
- 예외: `INTERNAL_ERROR`와 코드 없는 5xx는 서버 원문일 수 있어 고정 문구로 가립니다. 코드 있는 5xx(`S3_PRESIGN_FAILED` 등)는 사용자용 문구라 그대로 씁니다.
- 네트워크 실패는 status 0 `NETWORK`로 분류하고 재시도 버튼을 보여 줍니다.
- `BAD_USER_INPUT`은 폼 상단 알림, 그 외는 토스트(sonner-native)입니다. `NOT_FOUND`는 목록으로 돌려보냅니다.

## 6. UI

- **토큰은 `src/shared/config/tokens.ts` 한 곳**입니다. 색 hex는 이 파일에만 있고(`tokens.spec`이 `src`·`app` 전체를 검사), `tailwind.config.js`가 theme으로 읽습니다. NativeWind가 닿지 않는 곳(네이티브 헤더·탭바·sonner 테마·피커)은 TS에서 토큰을 직접 참조합니다.
- **NativeWind v4 + Tailwind 3.4**입니다. `className`이 무시되면 `babel.config.js`의 `jsxImportSource: 'nativewind'`를 먼저 봅니다. Jest에서 className → style 변환은 신뢰하지 않고 동작·텍스트로 단언합니다.
- **라이트 전용**입니다(`userInterfaceStyle: light`, 세로 고정). 다크 토큰을 두지 않습니다.
- **둥근 사각형 반경 규칙**(D43): 시안의 둥근 사각형을 pill로 그리지 않습니다.
  - 입력·버튼·상태 칩 `radius.sm`(8), 세그먼트·검색바·필터 칩 `radius.md`(10), 카드·옵션 그룹 `radius.xl`(16), FAB `radius['2xl']`(20), 바텀시트 상단 `radius.sheet`(28).
  - `radius.full`은 아바타·점 배지처럼 원이 맞는 곳에만 씁니다.
- **자간**(D44): Pretendard 본문 기본 `letterSpacing.tight`(-0.01em), 제목은 `-0.02em`까지. RN `letterSpacing`은 px라 `tracking(size, em)`으로 변환합니다.
- **Pretendard** 정적 4종(400·500·600·700)을 `expo-font` 플러그인으로 빌드에 임베드합니다. 양쪽 모두 `fontFamily: 'Pretendard'` + `fontWeight`로 씁니다.
- **접근성 기본**: 터치 타깃 44pt(`size.touchTarget`), 아이콘 버튼에는 `accessibilityLabel`. 안전 영역은 `useSafeAreaInsets`.
- **문구**는 한국어이며 feature별 상수 1곳에 둡니다. 조사는 `shared/lib/josa.ts`.
- **이미지 표시는 RN `Image`**, 월 달력은 자체 `MonthCalendar`(`shared/ui`), 시간 선택은 `@react-native-community/datetimepicker`(`TimeRow`), 드래그 정렬은 `react-native-sortables`입니다. `react-native-calendars`는 쓰지 않아 뺐습니다(D50).

## 7. 테스트

- `*.spec.ts(x)`를 소스 옆에 둡니다. `app/` 안에는 두지 않습니다(§2). `it`은 한국어 평서형입니다.
- **jest-expo** preset, 환경은 `react-native-env`(Node 기반)라 Node 24의 fetch가 MSW(`msw/node`)에 닿습니다. 앱 런타임에서는 MSW를 쓰지 않습니다.
- **RNTL 14는 전부 async**입니다: `await render(...)`, `await fireEvent.press(...)`, `await screen.findByText(...)`. 공용 렌더는 `src/test/render.tsx`(새 QueryClient·retry false·쿼리와 뮤테이션 gcTime 0·GestureHandlerRoot·BottomSheetModalProvider), 라우팅 검증은 `expo-router/testing-library`의 `renderRouter`.
- **네트워크는 MSW**로 계약 기반 mock(응답 모양은 codegen 타입을 따르고, 헬퍼는 `src/test/msw/graphql.ts`). fetch를 직접 stub하지 않습니다. `onUnhandledRequest: 'error'`.
- **네이티브 모듈 페이크**는 `src/test/mocks/index.ts`에만 둡니다(SecureStore Map·notifications·updates·file-system `File`). jest-expo가 비워 두는 것만 채우고, `afterEach`가 비웁니다.
- 계층
  - `model/*.spec.ts`: 순수 로직·스토어(주력).
  - `api/*.spec.ts`: MSW 계약.
  - `ui/*.spec.tsx`: 화면 경로 1~2개.
  - `shared/api/*.spec.ts`: refresh 1회·403 분기·ws 재연결. 반증 케이스를 포함합니다.
- **검사기·게이트를 만들면 반증 케이스가 본체**입니다. 입력 공간이 열거 가능하면 `it.each` 전수 표.
- gc 타이머(기본 5분)가 남으면 단일 spec 실행에서 jest가 끝나지 않습니다. 테스트 QueryClient를 직접 만들 때도 gcTime을 0이나 `Infinity`(타이머 없음)로 둡니다.
- 커버리지 임계는 `jest.config.js`의 statements 97 · branches 92 · functions 95 · lines 97(2026-10-06 실측의 정수 내림, D45)입니다. 화면이 늘어 실측이 오르면 같은 방식으로 올립니다. codegen 산출물·`src/shared/ui`·`src/test`는 제외입니다. CI는 3샤드로 나누고 샤드별 임계를 끈 뒤 `scripts/merge-coverage.ts`가 합친 결과로 검사합니다(샤드 하나는 일부 커버리지만 가집니다).

## 8. 명령어와 게이트

```bash
pnpm validate          # lint → typecheck → codegen:check → knip → test:cov → expo-doctor → expo export. pre-push와 동일, --no-verify 금지
pnpm start             # Metro(localhost:8081). 세션 끝에 종료
pnpm schema:pull [ref] # BE SDL 스냅샷 갱신(기본 develop). BE_DIR=../caquick-be 로 로컬 체크아웃 사용
pnpm codegen           # 스냅샷 + 문서 → src/graphql/generated (커밋 대상)
```

- CI(`pr-check.yml`, ubuntu)는 잡을 나눠 병렬로 돕니다. 필수 체크 `check`는 아래 잡이 모두 `success`인지 집계합니다(건너뜀·취소도 실패).
  - `lint`
  - `static`: typecheck → `codegen:check` → `knip` → `expo-doctor` → `expo export`(Metro 번들이 두 플랫폼에서 만들어지는지)
  - `test (1~3/3)`: jest `--shard`, `--json` 보고서를 아티팩트로 넘깁니다
  - `coverage-report`: 샤드가 전부 success인지 확인 → 보고서 병합·임계 판정 → Codecov(토큰 있을 때) → PR 댓글
- 필수 status check(Terraform ruleset): `check` · `pr-title` · `coverage-report` · `Analyze (javascript-typescript)`. 사람 승인은 없고 봇 리뷰(Codex·CodeRabbit)가 실질 게이트이며 절차는 BE와 같습니다.
- `release.yml`(맥미니 `macmini-seller`, 단일 잡)은 `main`의 CI 성공 뒤에 돕니다.
  1. main 끝 커밋인지 확인하고 호스트 락을 잡습니다.
  2. 도구 점검 → `pnpm install` → (롤백 입력이면 `eas update:republish` 후 종료).
  3. 시크릿 유무로 submit 가능 여부를 정하고, 플랫폼별 `eas fingerprint:generate`로 hash를 얻습니다.
  4. 원장 태그 `shipped/<platform>/<hash>`(제출 완료) 또는 `built/<platform>/<hash>`(아티팩트만)가 없으면 `nice`로 `eas build --local`을 돌리고, 시크릿이 있으면 `eas submit --path`로 올린 뒤 태그를 push합니다.
  5. `eas update --channel production`을 플랫폼별로 발행합니다. fingerprint가 그대로인 플랫폼은 항상, 바뀐 플랫폼은 빌드 성공 뒤에만. 응답의 `runtimeVersion`이 hash와 다르면 잡을 실패시킵니다.
  6. 아티팩트 업로드(14일) → 시크릿 정리 → 락 해제 → Discord.
- **fingerprint 계산과 production 채널 발행은 맥미니에서만** 합니다. 호스트 OS에 따라 값이 달라질 수 있어 다른 곳에서 발행하면 기기가 영영 업데이트를 못 받는 경우가 생깁니다. `preview` 채널은 로컬에서 자유입니다.
- 원장 태그는 로컬 빌드의 유일한 기록이므로 삭제하지 않습니다.
- 커밋은 Conventional Commits + 한국어 본문(commitlint), 브랜치는 `<type>/<대상>`. PR 본문에 `## 플랜 대조` 표를 넣습니다.

## 9. 운영 호스트 보호

맥미니는 BE 운영 컨테이너가 도는 호스트입니다. 이 레포의 무거운 작업은 전부 그 위에서 돌므로 아래를 지킵니다.

- **Metro는 세션 끝에 종료**합니다. `pnpm start`를 띄운 채 두지 않고, 로컬 BE(`nest watch`)도 같이 내립니다.
- **네이티브 빌드는 main 머지 때만** 합니다(`release.yml`, `concurrency: seller-release`). 훅이나 PR 검사에 빌드를 넣지 않고, 사람이 맥미니에서 `eas build --local`을 손으로 돌리지 않습니다.
- **호스트 락**(`scripts/host-lock.mjs`): BE jest와 같은 규약으로 `127.0.0.1:47391`을 exclusive listen한 쪽이 보유자입니다. 빌드 잡은 시작 때 `acquire`로 잡고 `always()` 단계에서 놓습니다. 프로세스가 어떻게 끝나든 OS가 포트를 풀어 고아 락이 남지 않습니다. 사람이 돌리는 `pnpm install`·jest·`expo export`도 `~/caquick-wt/run-locked.sh <명령>`으로 같은 락 안에서 돌립니다.
- 빌드는 `nice -n 15`, Gradle은 데몬 끄기·워커 4·힙 3g(`GRADLE_OPTS`), 잡 `timeout-minutes: 120`. 로컬 jest 워커는 4개(`jest.config.js`, CI는 기본값).
- 서명 자산·시크릿은 잡 안에서 복원하고 `always()`로 지웁니다. 레포에는 `.gitignore`의 서명 자산 패턴으로 막혀 있습니다.

## 출처

- [docs/guide/decisions.md](./decisions.md) D1~D50
- 관리자 FE `caquick-admin-fe`의 `docs/guide/architecture-conventions.md`(§2~§5·§7·§8의 골격)
- Expo: [Local builds](https://docs.expo.dev/build-reference/local-builds/) · [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/) · [Typed routes](https://docs.expo.dev/router/reference/typed-routes/) · [expo-router #47687](https://github.com/expo/expo/issues/47687) · [expo-router #50309](https://github.com/expo/expo/issues/50309)
- [RNTL v14 migration](https://oss.callstack.com/react-native-testing-library/docs/start/migration-v14) · [MSW React Native](https://mswjs.io/docs/integrations/react-native/) · [Hermes Intl APIs](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md)
- BE `src/test/jest-host-lock.ts`(호스트 락 규약)
