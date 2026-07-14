import type { DeckInput, DeckSummary } from "@limbus/contracts";
import { useCallback, useEffect, useState } from "react";
import { deckApi } from "./api";

const emptyDeck: DeckInput = { name: "", description: "", game: "", tags: [], cards: [] };

export function App() {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [draft, setDraft] = useState<DeckInput>(emptyDeck);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setDecks(await deckApi.list());
      setError("");
    } catch {
      setError("덱 목록을 불러오지 못했습니다. API가 실행 중인지 확인하세요.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await deckApi.create(draft);
      setDraft(emptyDeck);
      await load();
    } catch {
      setError("덱을 저장하지 못했습니다.");
    }
  };

  return (
    <main>
      <header>
        <p className="eyebrow">PWA DECK ARCHIVE</p>
        <h1>내 게임 덱</h1>
        <p>덱과 카드 정보를 한곳에 저장하세요.</p>
      </header>
      {error && <p className="error">{error}</p>}
      <section className="panel">
        <h2>새 덱</h2>
        <form onSubmit={submit}>
          <label>
            게임
            <input
              required
              value={draft.game}
              onChange={(e) => setDraft({ ...draft, game: e.target.value })}
            />
          </label>
          <label>
            덱 이름
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            설명
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <button type="submit">덱 저장</button>
        </form>
      </section>
      <section>
        <h2>
          저장된 덱 <span>{decks.length}</span>
        </h2>
        <div className="grid">
          {decks.map((deck) => (
            <article key={deck.id}>
              <small>{deck.game}</small>
              <h3>{deck.name}</h3>
              <time>{new Date(deck.updatedAt).toLocaleString("ko-KR")}</time>
            </article>
          ))}
          {decks.length === 0 && <p className="empty">아직 저장된 덱이 없습니다.</p>}
        </div>
      </section>
    </main>
  );
}
