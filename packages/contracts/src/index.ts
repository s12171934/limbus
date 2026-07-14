import { type Static, Type } from "@sinclair/typebox";

export const CardSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 100 }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  quantity: Type.Integer({ minimum: 1, maximum: 99 }),
  note: Type.Optional(Type.String({ maxLength: 500 })),
});

export const DeckSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.String({ maxLength: 2000, default: "" }),
  game: Type.String({ minLength: 1, maxLength: 100 }),
  tags: Type.Array(Type.String({ minLength: 1, maxLength: 40 }), { maxItems: 20 }),
  cards: Type.Array(CardSchema, { maxItems: 500 }),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export const DeckInputSchema = Type.Pick(DeckSchema, [
  "name",
  "description",
  "game",
  "tags",
  "cards",
]);

export const DeckSummarySchema = Type.Pick(DeckSchema, [
  "id",
  "name",
  "game",
  "tags",
  "createdAt",
  "updatedAt",
]);

export const ApiErrorSchema = Type.Object({
  error: Type.Object({ code: Type.String(), message: Type.String() }),
});

export type Card = Static<typeof CardSchema>;
export type Deck = Static<typeof DeckSchema>;
export type DeckInput = Static<typeof DeckInputSchema>;
export type DeckSummary = Static<typeof DeckSummarySchema>;
export type ApiError = Static<typeof ApiErrorSchema>;
