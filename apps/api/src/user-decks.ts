import { DurableObject } from "cloudflare:workers";
import type { Deck, DeckInput, DeckSummary } from "@limbus/contracts";

type DeckRow = {
  id: string;
  name: string;
  game: string;
  tags: string;
  created_at: string;
  updated_at: string;
};

export class UserDecks extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS deck_index (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          game TEXT NOT NULL,
          tags TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS deck_index_updated_at
          ON deck_index(updated_at DESC);
      `);
    });
  }

  async list(): Promise<DeckSummary[]> {
    return this.ctx.storage.sql
      .exec<DeckRow>("SELECT * FROM deck_index ORDER BY updated_at DESC")
      .toArray()
      .map(toSummary);
  }

  async get(userId: string, deckId: string): Promise<Deck | null> {
    const object = await this.env.DECKS.get(objectKey(userId, deckId));
    return object ? object.json<Deck>() : null;
  }

  async create(userId: string, input: DeckInput): Promise<Deck> {
    const now = new Date().toISOString();
    const deck: Deck = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await this.persist(userId, deck);
    return deck;
  }

  async update(userId: string, deckId: string, input: DeckInput): Promise<Deck | null> {
    const previous = await this.get(userId, deckId);
    if (!previous) return null;
    const deck: Deck = {
      ...input,
      id: deckId,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await this.persist(userId, deck);
    return deck;
  }

  async remove(userId: string, deckId: string): Promise<boolean> {
    const exists =
      this.ctx.storage.sql
        .exec<{ found: number }>(
          "SELECT EXISTS(SELECT 1 FROM deck_index WHERE id = ?) AS found",
          deckId,
        )
        .one().found === 1;
    if (!exists) return false;
    await this.env.DECKS.delete(objectKey(userId, deckId));
    this.ctx.storage.sql.exec("DELETE FROM deck_index WHERE id = ?", deckId);
    return true;
  }

  private async persist(userId: string, deck: Deck): Promise<void> {
    await this.env.DECKS.put(objectKey(userId, deck.id), JSON.stringify(deck), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { userId, deckId: deck.id },
    });
    this.ctx.storage.sql.exec(
      `INSERT INTO deck_index (id, name, game, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, game = excluded.game, tags = excluded.tags,
         updated_at = excluded.updated_at`,
      deck.id,
      deck.name,
      deck.game,
      JSON.stringify(deck.tags),
      deck.createdAt,
      deck.updatedAt,
    );
  }
}

function objectKey(userId: string, deckId: string): string {
  return `users/${encodeURIComponent(userId)}/decks/${deckId}.json`;
}

function toSummary(row: DeckRow): DeckSummary {
  return {
    id: row.id,
    name: row.name,
    game: row.game,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
