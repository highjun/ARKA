export interface Activation {
  readonly id: string;
  readonly index: number;
}

let current: Activation | undefined;
let nextIndex = 0;

export const runActivating = <R>(id: string, fn: () => R): R => {
  const previous = current;
  current = { id, index: nextIndex };
  nextIndex += 1;
  try {
    return fn();
  } finally {
    current = previous;
  }
};

export const currentActivation = (): Activation | undefined => current;
