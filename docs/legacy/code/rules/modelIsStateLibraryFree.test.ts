import { modelIsStateLibraryFree } from "./modelIsStateLibraryFree";
import { createRuleTester } from "./ruleTester";

createRuleTester().run("model-is-state-library-free", modelIsStateLibraryFree, {
  valid: [
    { name: "core의 이벤트는 된다", code: "import { Emitter } from '#core/events';" },
    { name: "타입만 가져오는 것은 된다", code: "import type { ComponentType } from 'react';" },
    { name: "contracts는 된다", code: "import { URI } from 'contracts';" },
  ],
  invalid: [
    { name: "nanostores", code: "import { atom } from 'nanostores';", errors: [{ messageId: "forbidden" }] },
    { name: "react 값 import", code: "import { useState } from 'react';", errors: [{ messageId: "forbidden" }] },
    { name: "하위 경로도 잡는다", code: "import x from 'zustand/vanilla';", errors: [{ messageId: "forbidden" }] },
    { name: "mobx", code: "import { observable } from 'mobx';", errors: [{ messageId: "forbidden" }] },
  ],
});
