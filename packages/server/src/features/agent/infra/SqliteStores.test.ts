import { testEventStoreContract } from "../domain/eventStore.contract";
import { testSessionStoreContract } from "../domain/sessionStore.contract";
import { openDatabase } from "./database";
import { SqliteEventStore } from "./SqliteEventStore";
import { SqliteSessionStore } from "./SqliteSessionStore";

testEventStoreContract("SqliteEventStore", () => new SqliteEventStore(openDatabase(":memory:")));
testSessionStoreContract("SqliteSessionStore", () => new SqliteSessionStore(openDatabase(":memory:")));
