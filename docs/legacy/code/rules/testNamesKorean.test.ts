import { createRuleTester } from "./ruleTester";
import { testNamesKorean } from "./testNamesKorean";

createRuleTester().run("test-names-korean", testNamesKorean, {
  valid: [
    { name: "한글 문장", code: "it('없는 파일을 읽으면 NotFound를 던진다', () => {});" },
    { name: "식별자가 섞인 한글", code: "it('onValueChange 가 불린다', () => {});" },
    { name: "describe는 대상이 아니다", code: "describe('listDirectory', () => {});" },
    { name: "it.each 템플릿", code: "it.each([1])('%s 를 받는다', () => {});" },
    { name: "test.only", code: "test.only('돈다', () => {});" },
    { name: "이름이 문자열이 아니면 넘어간다", code: "it(name, () => {});" },
  ],
  invalid: [
    { name: "영문 it", code: "it('renders the title', () => {});", errors: [{ messageId: "notKorean" }] },
    { name: "영문 test", code: "test('works', () => {});", errors: [{ messageId: "notKorean" }] },
    { name: "영문 it.each", code: "it.each([1])('accepts %s', () => {});", errors: [{ messageId: "notKorean" }] },
    { name: "영문 템플릿", code: "it(`handles ${x}`, () => {});", errors: [{ messageId: "notKorean" }] },
  ],
});
