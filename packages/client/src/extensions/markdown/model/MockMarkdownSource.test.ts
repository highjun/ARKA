import { MockMarkdownSource } from "./MockMarkdownSource";
import { testMarkdownSourceContract } from "./markdownSource.contract";

testMarkdownSourceContract("MockMarkdownSource", (files) => {
  const source = new MockMarkdownSource(files);
  return {
    source,
    write: (path, content) => {
      source.write(path, content);
    },
  };
});
