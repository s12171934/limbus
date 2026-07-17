# Limbus Deck

게임 덱과 카드 정보를 저장하는 Bun + Turbo 모노레포입니다.

## 구조

- `apps/web`: React + Vite PWA, Cloudflare Pages 배포
- `apps/api`: Elysia Worker, 사용자별 Durable Object RPC, R2 저장
- `packages/contracts`: TypeBox 기반 공용 요청/응답 스키마와 타입

브라우저 → Elysia Worker 구간은 HTTP JSON API이며, Worker → Durable Object 구간은 Cloudflare RPC입니다. 사용자별 `UserDecks` DO가 목록 인덱스를 SQLite에 보관하고, 전체 덱 JSON은 R2의 `users/{userId}/decks/{deckId}.json`에 저장합니다.

## 시작

```bash
bun install
bun run dev
```

Web은 `http://localhost:5173`, API는 `http://localhost:8787`에서 실행됩니다. Turbo가 두 개발 서버를 함께 실행합니다.
Turbo 실행 화면은 `turbo.json`의 `ui: "tui"` 설정을 사용합니다.

개별 실행:

```bash
bun run --cwd apps/api dev
bun run --cwd apps/web dev
```

## 검증

```bash
bun run check
bun run quality
bun run test
bun run build
```

Biome 명령은 다음과 같습니다.

```bash
bun run lint          # lint 검사
bun run format        # 포맷 적용
bun run format:check  # 포맷 검사
bun run quality:fix   # lint, format, import 정리 적용
```

## Cloudflare 준비 및 배포

최초 한 번 R2 버킷과 Pages 프로젝트를 만듭니다.

```bash
bunx wrangler r2 bucket create limbus-decks
bunx wrangler pages project create limbus-deck
```

운영 프론트 주소에 맞게 `apps/api/wrangler.jsonc`의 `ALLOWED_ORIGIN`을 환경별로 설정한 뒤 배포합니다.

```bash
bun run --cwd apps/api deploy
bun run --cwd apps/web build
bun run --cwd apps/web deploy
```

루트에서 한 번에 배포하려면 다음 명령을 사용합니다.

```bash
bun run deploy
```

GitHub Actions 배포는 `.github/workflows/deploy.yml`에서 `main` 브랜치 push 또는 수동 실행 시 동작합니다. GitHub 저장소의 `Settings > Secrets and variables > Actions`에 다음 Secrets를 등록해야 합니다.

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

다음 Variables도 등록해야 합니다.

- `CLOUDFLARE_PAGES_PROJECT_NAME`
- `VITE_API_BASE_URL`

Cloudflare의 자체 Git 배포를 사용하지 않을 경우 Workers/Pages 프로젝트의 자동 배포 연결을 끄고, GitHub Actions만 배포 권한을 갖도록 운영합니다. Cloudflare API Token은 Workers와 Pages 배포가 가능한 권한으로 생성해야 합니다.

Cloudflare Workers Git 빌드를 계속 쓸 경우 루트 디렉터리를 저장소 루트로 두고 빌드 명령 `bun run build`, 배포 명령 `bun run deploy:api`를 사용합니다. `npx wrangler deploy`는 모노레포 루트에서 실행되어 앱 위치를 찾지 못하므로 사용하지 않습니다.

Cloudflare Pages Git 빌드는 루트 디렉터리를 저장소 루트로 두고 빌드 명령 `bun run --cwd apps/web build`, 출력 디렉터리 `apps/web/dist`를 사용합니다. Production branch는 `main`입니다.

## 인증 관련 주의

현재 `X-User-Id`는 아키텍처 확인용 임시 식별자입니다. 실제 서비스 전에 Cloudflare Access, OAuth 또는 세션 기반 인증을 추가하고, 검증된 사용자 ID만 DO 이름으로 사용해야 합니다.
