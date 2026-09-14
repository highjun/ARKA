import { MockStorage } from "./MockStorage";
import { testStorageContract } from "./storage.contract";

testStorageContract("MockStorage", () => new MockStorage());
