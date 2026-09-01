import { describe, expect, it } from "vitest";
import { sortReferenceIdsByScore } from "@/lib/screening/service";

describe("sortReferenceIdsByScore", () => {
  const refs = [
    { id: "a", score: 10 },
    { id: "b", score: 50 },
    { id: "c", score: 30 },
    { id: "d", score: null },
  ];

  it("orders by score descending across all references", () => {
    expect(sortReferenceIdsByScore(refs, "score_desc")).toEqual(["b", "c", "a", "d"]);
  });

  it("orders by score ascending across all references", () => {
    expect(sortReferenceIdsByScore(refs, "score_asc")).toEqual(["d", "a", "c", "b"]);
  });
});
