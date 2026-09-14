import { MockSearchService } from "./MockSearchService";
import { testSearchServiceContract } from "./searchService.contract";

testSearchServiceContract("MockSearchService", () => {
  const service = new MockSearchService();
  return {
    service,
    seed: (files) => {
      service.seed(files);
      return Promise.resolve();
    },
  };
});
