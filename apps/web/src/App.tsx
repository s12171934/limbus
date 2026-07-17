import type { Deck, DeckInput } from "@limbus/contracts";
import { useCallback, useEffect, useState } from "react";
import { deckApi } from "./api";

const sinners = [
  "이상",
  "파우스트",
  "돈키호테",
  "료슈",
  "뫼르소",
  "홍루",
  "히스클리프",
  "이스마엘",
  "로쟈",
  "싱클레어",
  "오티스",
  "그레고르",
] as const;

type Sinner = (typeof sinners)[number];
type IdentityDraft = Record<Sinner, string>;
type Keyword = (typeof keywords)[number];
type FilterMode = "and" | "or";
type IdentityOption = {
  name: string;
  keywords: Keyword[];
};
type IdentityOptions = Record<Sinner, IdentityOption[]>;

const keywords = ["화상", "출혈", "진동", "파열", "침잠", "호흡", "충전"] as const;

const identityOptions: IdentityOptions = {
  이상: [{ name: "LCB 수감자 이상", keywords: ["침잠", "파열"] }],
  파우스트: [{ name: "LCB 수감자 파우스트", keywords: ["충전", "진동"] }],
  돈키호테: [{ name: "LCB 수감자 돈키호테", keywords: ["출혈", "호흡"] }],
  료슈: [{ name: "LCB 수감자 료슈", keywords: ["화상", "출혈"] }],
  뫼르소: [{ name: "LCB 수감자 뫼르소", keywords: ["진동", "파열"] }],
  홍루: [{ name: "LCB 수감자 홍루", keywords: ["충전", "호흡"] }],
  히스클리프: [{ name: "LCB 수감자 히스클리프", keywords: ["파열", "출혈"] }],
  이스마엘: [{ name: "LCB 수감자 이스마엘", keywords: ["침잠", "충전"] }],
  로쟈: [{ name: "LCB 수감자 로쟈", keywords: ["화상", "진동"] }],
  싱클레어: [{ name: "LCB 수감자 싱클레어", keywords: ["화상", "침잠"] }],
  오티스: [{ name: "LCB 수감자 오티스", keywords: ["호흡", "진동"] }],
  그레고르: [{ name: "LCB 수감자 그레고르", keywords: ["파열", "침잠"] }],
};

const emptyIdentities = sinners.reduce(
  (slots, sinner) => ({ ...slots, [sinner]: "" }),
  {} as IdentityDraft,
);

const emptyDeck: DeckInput = {
  name: "",
  description: "",
  game: "림버스 컴퍼니",
  tags: [],
  cards: [],
};
const temporaryDeckName = "임시저장된 덱";

function isSinner(value: string | undefined): value is Sinner {
  return sinners.includes(value as Sinner);
}

function identitiesFromDeck(deck: Deck): IdentityDraft {
  return deck.cards.reduce((slots, card) => {
    const sinner = isSinner(card.note) ? card.note : isSinner(card.id) ? card.id : undefined;
    return sinner ? { ...slots, [sinner]: card.name } : slots;
  }, emptyIdentities);
}

export function App() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [draft, setDraft] = useState<DeckInput>(emptyDeck);
  const [identities, setIdentities] = useState<IdentityDraft>(emptyIdentities);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSinner, setActiveSinner] = useState<Sinner | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("or");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const summaries = await deckApi.list();
      const deckDetails = await Promise.all(summaries.map((deck) => deckApi.get(deck.id)));
      setDecks(deckDetails);
      setError("");
    } catch {
      setError("덱 목록을 불러오지 못했습니다. API가 실행 중인지 확인하세요.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const makeDraftInput = (name = draft.name): DeckInput => {
    const cards = sinners
      .map((sinner) => ({ sinner, identity: identities[sinner].trim() }))
      .filter(({ identity }) => identity.length > 0)
      .map(({ sinner, identity }) => ({
        id: sinner,
        name: identity,
        quantity: 1,
        note: sinner,
      }));

    return {
      ...draft,
      name: name.trim() || temporaryDeckName,
      game: "림버스 컴퍼니",
      cards,
    };
  };

  const persistDraft = async () => {
    const input = makeDraftInput();
    const existingTemporaryDeck = decks.find(
      (deck) => deck.name === temporaryDeckName && deck.id !== editingDeckId,
    );
    const targetDeckId = editingDeckId ?? existingTemporaryDeck?.id;
    let savedDeck: Deck;

    if (targetDeckId) {
      try {
        savedDeck = await deckApi.update(targetDeckId, input);
      } catch {
        savedDeck = await deckApi.create(input);
      }
    } else {
      savedDeck = await deckApi.create(input);
    }

    setDraft({
      name: savedDeck.name,
      description: savedDeck.description,
      game: savedDeck.game,
      tags: savedDeck.tags,
      cards: savedDeck.cards,
    });
    setIdentities(identitiesFromDeck(savedDeck));
    setEditingDeckId(savedDeck.id);
    setIsDirty(false);
    await load();
    return savedDeck;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await persistDraft();
    } catch {
      setError("덱을 저장하지 못했습니다.");
    }
  };

  const selectDeck = async (deckId: string) => {
    try {
      if (editingDeckId !== deckId && (isDirty || !editingDeckId)) await persistDraft();
      const deck = await deckApi.get(deckId);
      setDraft({
        name: deck.name,
        description: deck.description,
        game: deck.game,
        tags: deck.tags,
        cards: deck.cards,
      });
      setIdentities(identitiesFromDeck(deck));
      setEditingDeckId(deck.id);
      setIsDirty(false);
      setActiveSinner(null);
      setError("");
    } catch {
      setError("저장된 덱 데이터를 불러오지 못했습니다.");
    }
  };

  const removeDeck = async (deckId: string) => {
    const previousDecks = decks;
    const previousDraft = draft;
    const previousIdentities = identities;
    const previousEditingDeckId = editingDeckId;
    const previousIsDirty = isDirty;
    const isEditingDeletedDeck = editingDeckId === deckId;

    setDecks((current) => current.filter((deck) => deck.id !== deckId));
    if (isEditingDeletedDeck) resetDraft();

    try {
      await deckApi.remove(deckId);
      setError("");
    } catch {
      setDecks(previousDecks);
      setDraft(previousDraft);
      setIdentities(previousIdentities);
      setEditingDeckId(previousEditingDeckId);
      setIsDirty(previousIsDirty);
      setError("저장된 덱을 삭제하지 못했습니다.");
    }
  };

  const resetDraft = () => {
    setDraft(emptyDeck);
    setIdentities(emptyIdentities);
    setEditingDeckId(null);
    setIsDirty(false);
    setActiveSinner(null);
    setSelectedKeywords([]);
    setFilterMode("or");
    setError("");
  };

  const filledCount = sinners.filter((sinner) => identities[sinner].trim()).length;
  const visibleIdentityGroups = activeSinner ? [activeSinner] : sinners;
  const visibleIdentities = visibleIdentityGroups.flatMap((sinner) =>
    identityOptions[sinner]
      .filter(({ keywords: identityKeywords }) => {
        if (selectedKeywords.length === 0) return true;
        if (filterMode === "and") {
          return selectedKeywords.every((keyword) => identityKeywords.includes(keyword));
        }
        return selectedKeywords.some((keyword) => identityKeywords.includes(keyword));
      })
      .map((identity) => ({ sinner, ...identity })),
  );

  const findDecksIncluding = (identity: string) =>
    decks.filter((deck) => deck.cards.some((card) => card.name === identity));

  const toggleKeyword = (keyword: Keyword) => {
    setSelectedKeywords((current) =>
      current.includes(keyword)
        ? current.filter((selected) => selected !== keyword)
        : [...current, keyword],
    );
  };

  return (
    <main className="app-shell">
      {error && <p className="error">{error}</p>}
      <div className="workspace">
        <section className="deck-builder" aria-labelledby="new-deck-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEW FORMATION</p>
              <h2 id="new-deck-title">새 덱 구성</h2>
            </div>
            <div className="builder-actions">
              <span>{filledCount}명 편성됨</span>
              <button type="button" onClick={resetDraft}>
                초기화
              </button>
            </div>
          </div>
          <form onSubmit={submit}>
            <div className="deck-meta">
              <label>
                덱 이름
                <input
                  placeholder="예: 거던 출혈덱"
                  value={draft.name}
                  onChange={(e) => {
                    setDraft({ ...draft, name: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </label>
            </div>
            <div className="identity-board">
              {sinners.map((sinner, index) => (
                <button
                  className={`identity-slot ${activeSinner === sinner ? "active" : ""}`}
                  key={sinner}
                  type="button"
                  onClick={() => setActiveSinner(activeSinner === sinner ? null : sinner)}
                >
                  <span className="slot-heading">
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    {sinner}
                  </span>
                  <strong>{identities[sinner] || "인격 미선택"}</strong>
                </button>
              ))}
            </div>
            <div
              className="identity-picker"
              aria-label={activeSinner ? `${activeSinner} 인격 리스트` : "전체 인격 리스트"}
            >
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">IDENTITY LIST</p>
                  <h2>{activeSinner ? `${activeSinner} 인격 리스트` : "전체 인격 리스트"}</h2>
                </div>
              </div>
              <div className="filter-panel" aria-label="키워드 필터">
                <div className="filter-mode" role="group" aria-label="필터 조건">
                  <button
                    className={filterMode === "or" ? "active" : ""}
                    type="button"
                    onClick={() => setFilterMode("or")}
                  >
                    OR
                  </button>
                  <button
                    className={filterMode === "and" ? "active" : ""}
                    type="button"
                    onClick={() => setFilterMode("and")}
                  >
                    AND
                  </button>
                </div>
                <div className="keyword-filter" aria-label="키워드 선택">
                  {keywords.map((keyword) => (
                    <button
                      className={selectedKeywords.includes(keyword) ? "active" : ""}
                      key={keyword}
                      type="button"
                      onClick={() => toggleKeyword(keyword)}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>
              <div className="identity-option-list">
                {visibleIdentities.length > 0 ? (
                  visibleIdentities.map(({ sinner, name, keywords: identityKeywords }) => {
                    const includedDecks = findDecksIncluding(name);
                    const isSelected = identities[sinner] === name;
                    return (
                      <button
                        className={`identity-option ${isSelected ? "selected" : ""}`}
                        key={`${sinner}-${name}`}
                        type="button"
                        onClick={() => {
                          setIdentities({
                            ...identities,
                            [sinner]: isSelected ? "" : name,
                          });
                          setIsDirty(true);
                        }}
                      >
                        <span>
                          <small>{sinner}</small>
                          <strong>{name}</strong>
                        </span>
                        <em>{includedDecks.length}개 덱</em>
                        <div className="identity-keywords">
                          {identityKeywords.length > 0 ? (
                            identityKeywords.map((keyword) => <b key={keyword}>{keyword}</b>)
                          ) : (
                            <b>키워드 미지정</b>
                          )}
                        </div>
                        <p>
                          {includedDecks.length > 0
                            ? includedDecks.map((deck) => deck.name).join(", ")
                            : "아직 포함된 저장 덱이 없습니다."}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="empty">조건에 맞는 인격이 없습니다.</p>
                )}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit">덱 저장</button>
            </div>
          </form>
        </section>
        <aside className="saved-decks" aria-labelledby="saved-decks-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">ARCHIVE</p>
              <h2 id="saved-decks-title">저장된 덱</h2>
            </div>
            <span>{decks.length}</span>
          </div>
          <div className="deck-list">
            <article className="draft-deck">
              <small>현재 편집 중</small>
              <h3>{draft.name.trim() || temporaryDeckName}</h3>
              <p>{filledCount}명 편성됨</p>
            </article>
            {decks.map((deck) => (
              <article className="saved-deck-row" key={deck.id}>
                <button
                  className="saved-deck-card"
                  type="button"
                  onClick={() => selectDeck(deck.id)}
                >
                  <small>{deck.game}</small>
                  <h3>{deck.name}</h3>
                  <time>{new Date(deck.updatedAt).toLocaleString("ko-KR")}</time>
                </button>
                <button
                  className="delete-deck-button"
                  type="button"
                  onClick={() => removeDeck(deck.id)}
                >
                  삭제
                </button>
              </article>
            ))}
            {decks.length === 0 && <p className="empty">아직 저장된 덱이 없습니다.</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}
