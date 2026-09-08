import { testEventStoreContract } from "../domain/eventStore.contract";
import { MemoryEventStore } from "./MemoryEventStore";

testEventStoreContract("MemoryEventStore", () => new MemoryEventStore());
