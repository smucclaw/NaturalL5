import * as Runtime from "./errors";

export type Maybe<T> = T | undefined;
export const INDENT = "  ";

export function peek<T>(xs: T[]): T {
  return xs[xs.length - 1]!;
}

export function range(a: number, b: number): number[] {
  return Array.from(new Array(b - a), (_, i) => i + a);
}

export function flatten<T>(xs: T[][]): T[] {
  return xs.reduce((a,b) => a.concat(b));
}

export function empty<T>(xs: T[]) {
  while (xs.length) xs.pop();
}

export function id<T>(x: T): T {
  return x;
}

export function zip<U, V>(xs: U[], ys: V[]): [U, V][] {
  return xs.length < ys.length
    ? xs.map((v, i) => [v, ys[i]!])
    : ys.map((v, i) => [xs[i]!, v]);
}
