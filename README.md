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

Cloudflare Pages Git 빌드는 루트 디렉터리를 저장소 루트로 두고 빌드 명령 `bun run --cwd apps/web build`, 출력 디렉터리 `apps/web/dist`를 사용합니다. Production branch는 `main`입니다.

## 인증 관련 주의

현재 `X-User-Id`는 아키텍처 확인용 임시 식별자입니다. 실제 서비스 전에 Cloudflare Access, OAuth 또는 세션 기반 인증을 추가하고, 검증된 사용자 ID만 DO 이름으로 사용해야 합니다.
