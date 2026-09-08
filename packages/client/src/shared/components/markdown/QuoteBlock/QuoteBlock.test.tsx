import { describe } from 'vitest';
import {
  implementsClassName,
  implementsDataComponent,
  implementsForwardRef,
  implementsNoA11yViolations,
} from '#utils/testing';
import { QuoteBlock } from './QuoteBlock';

describe('QuoteBlock', () => {
  implementsClassName((extra) => <QuoteBlock {...extra}>인용문</QuoteBlock>);
  implementsDataComponent((extra) => <QuoteBlock {...extra}>인용문</QuoteBlock>, 'QuoteBlock');
  implementsForwardRef((extra) => <QuoteBlock {...extra}>인용문</QuoteBlock>, HTMLQuoteElement);
  implementsNoA11yViolations(() => <QuoteBlock>인용문</QuoteBlock>);
});
