import { describe, expect, it } from "vitest";
import { runActivating } from "./activation";
import { Collection, type CollectionEntry } from "#core/registry";

describe("Collection", () => {
  it("담은 순서대로 나열한다", () => {
    const collection = new Collection<string>();
    collection.add("a");
    collection.add("b");

    expect(collection.list()).toEqual(["a", "b"]);
  });

  it("켜는 중인 확장의 id와 순서를 같이 기록한다", () => {
    const collection = new Collection<string>();
    runActivating("arka.first", () => collection.add("a"));
    runActivating("arka.second", () => collection.add("b"));

    const entries: readonly CollectionEntry<string>[] = collection.entries();
    const activations = entries.map((entry) => entry.activation);
    expect(activations.map((activation) => activation?.id)).toEqual(["arka.first", "arka.second"]);
    expect(activations[0]?.index).toBeLessThan(activations[1]?.index ?? -1);
  });

  it("켜는 중이 아니면 activation이 undefined다", () => {
    const collection = new Collection<string>();
    collection.add("a");

    expect(collection.entries()[0]?.activation).toBeUndefined();
  });

  it("runActivating이 끝나면 이전 상태로 돌아간다", () => {
    const collection = new Collection<string>();
    runActivating("arka.outer", () => {
      runActivating("arka.inner", () => collection.add("inner"));
      collection.add("outer");
    });
    collection.add("none");

    expect(collection.entries().map((entry) => entry.activation?.id)).toEqual(["arka.inner", "arka.outer", undefined]);
  });
});
