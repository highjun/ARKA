import { testSessionStoreContract } from "../domain/sessionStore.contract";
import { MemorySessionStore } from "./MemorySessionStore";

testSessionStoreContract("MemorySessionStore", () => new MemorySessionStore());
