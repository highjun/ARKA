import { createRuleTester } from "./ruleTester";
import { viewOnlyUsesViewModel } from "./viewOnlyUsesViewModel";

createRuleTester().run("view-only-uses-view-model", viewOnlyUsesViewModel, {
  valid: [
    { name: "useViewModel만 부른다", code: "const vm = useViewModel(Token);" },
    { name: "훅이 아닌 함수는 상관없다", code: "const x = compute(1); user.resolveName();" },
    { name: "use로 시작하지 않는 멤버 호출", code: "viewModel.select(1);" },
  ],
  invalid: [
    { name: "useState", code: "const [a, b] = useState(0);", errors: [{ messageId: "hookNotAllowed" }] },
    { name: "React.useState — 멤버 호출로 우회하는 형태", code: "const [a, b] = React.useState(0);", errors: [{ messageId: "hookNotAllowed" }] },
    { name: "useEffect", code: "useEffect(() => {}, []);", errors: [{ messageId: "hookNotAllowed" }] },
    { name: "useAppContext", code: "const c = useAppContext();", errors: [{ messageId: "diAccessNotAllowed" }] },
    { name: "container.resolve", code: "const vm = container.resolve(Token);", errors: [{ messageId: "diAccessNotAllowed" }] },
  ],
});
