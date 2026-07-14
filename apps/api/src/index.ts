import { type DeckInput, DeckInputSchema } from "@limbus/contracts";
import { Value } from "@sinclair/typebox/value";
import { Elysia } from "elysia";
import { UserDecks } from "./user-decks";

export { UserDecks };

function api(env: Env) {
  return new Elysia({ aot: false, prefix: "/api" })
    .onRequest(({ request, set }) => {
      set.headers["access-control-allow-origin"] = env.ALLOWED_ORIGIN;
      set.headers["access-control-allow-headers"] = "content-type, x-user-id";
      set.headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS";
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(env.ALLOWED_ORIGIN) });
      }
    })
    .derive(({ request, set }) => {
      const userId = request.headers.get("x-user-id")?.trim();
      if (!userId) {
        set.status = 401;
        throw new Error("X-User-Id header is required");
      }
      return { decks: env.USER_DECKS.getByName(userId), userId };
    })
    .get("/health", () => ({ status: "ok" as const }))
    .get("/decks", async ({ decks }) => await decks.list())
    .get("/decks/:id", async ({ decks, userId, params, set }) => {
      const deck = await decks.get(userId, params.id);
      if (!deck) {
        set.status = 404;
        return error("NOT_FOUND", "Deck not found");
      }
      return deck;
    })
    .post("/decks", async ({ decks, userId, body, set }) => {
      if (!isDeckInput(body)) {
        set.status = 400;
        return error("VALIDATION_ERROR", "Request validation failed");
      }
      set.status = 201;
      return await decks.create(userId, body);
    })
    .put("/decks/:id", async ({ decks, userId, params, body, set }) => {
      if (!isDeckInput(body)) {
        set.status = 400;
        return error("VALIDATION_ERROR", "Request validation failed");
      }
      const deck = await decks.update(userId, params.id, body);
      if (!deck) {
        set.status = 404;
        return error("NOT_FOUND", "Deck not found");
      }
      return deck;
    })
    .delete("/decks/:id", async ({ decks, userId, params, set }) => {
      if (!(await decks.remove(userId, params.id))) {
        set.status = 404;
        return error("NOT_FOUND", "Deck not found");
      }
      return new Response(null, { status: 204, headers: corsHeaders(env.ALLOWED_ORIGIN) });
    })
    .onError(({ error: cause, code, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return error("VALIDATION_ERROR", "Request validation failed");
      }
      const message = cause instanceof Error ? cause.message : "Unknown error";
      if (message === "X-User-Id header is required") return error("UNAUTHORIZED", message);
      console.error(JSON.stringify({ message: "request failed", error: message }));
      set.status = 500;
      return error("INTERNAL_ERROR", "Internal server error");
    });
}

function error(code: string, message: string) {
  return { error: { code, message } };
}

function isDeckInput(value: unknown): value is DeckInput {
  return Value.Check(DeckInputSchema, value);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "content-type, x-user-id",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

export default {
  async fetch(request, env): Promise<Response> {
    return await api(env).fetch(request);
  },
} satisfies ExportedHandler<Env>;
