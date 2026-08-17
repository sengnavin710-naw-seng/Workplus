declare module "bun:test" {
  type TestCallback = () => void | Promise<void>;

  interface TestFunction {
    (name: string, callback: TestCallback): void;
    each<T>(cases: readonly T[]): (
      name: string,
      callback: (value: T) => void | Promise<void>,
    ) => void;
  }

  interface Matchers {
    not: Omit<Matchers, "not">;
    toBe(expected: unknown): void;
    toContain(expected: unknown): void;
  }

  export const test: TestFunction;
  export function describe(name: string, callback: TestCallback): void;
  export function expect(actual: unknown): Matchers;
}
