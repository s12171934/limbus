import type { Deck, DeckInput, DeckSummary } from "@limbus/contracts";

const userId = "local-demo-user"; // 인증 도입 전 개발용 식별자

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-user-id": userId, ...init?.headers },
  });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export const deckApi = {
  list: () => request<DeckSummary[]>("/decks"),
  get: (id: string) => request<Deck>(`/decks/${id}`),
  create: (input: DeckInput) =>
    request<Deck>("/decks", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: DeckInput) =>
    request<Deck>(`/decks/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/decks/${id}`, { method: "DELETE" }),
};
