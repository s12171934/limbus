import { SELF } from "cloudflare:test";
import type { Deck, DeckSummary } from "@limbus/contracts";
import { describe, expect, it } from "vitest";

const headers = {
  "content-type": "application/json",
  "x-user-id": "test-user",
};

describe("deck API", () => {
  it("creates, reads, lists, updates, and deletes an R2-backed deck", async () => {
    const createdResponse = await SELF.fetch("http://example.com/api/decks", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Starter",
        description: "First deck",
        game: "Example Game",
        tags: ["starter"],
        cards: [{ id: "card-1", name: "First Card", quantity: 2 }],
      }),
    });
    expect(createdResponse.status, await createdResponse.clone().text()).toBe(201);
    const created = await createdResponse.json<Deck>();

    const getResponse = await SELF.fetch(`http://example.com/api/decks/${created.id}`, { headers });
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json<Deck>()).toEqual(created);

    const listResponse = await SELF.fetch("http://example.com/api/decks", { headers });
    const summaries = await listResponse.json<DeckSummary[]>();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.name).toBe("Starter");

    const updateResponse = await SELF.fetch(`http://example.com/api/decks/${created.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...created, name: "Updated" }),
    });
    expect(updateResponse.status).toBe(200);
    expect((await updateResponse.json<Deck>()).name).toBe("Updated");

    const deleteResponse = await SELF.fetch(`http://example.com/api/decks/${created.id}`, {
      method: "DELETE",
      headers,
    });
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await SELF.fetch(`http://example.com/api/decks/${created.id}`, {
      headers,
    });
    expect(missingResponse.status).toBe(404);
  });
});
