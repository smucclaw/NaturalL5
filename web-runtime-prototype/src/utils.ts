import * as Runtime from "./Errors";

export type Maybe<T> = T | undefined;
export const INDENT = "  ";

export function takeWhile<T>(fn: (x:T) => boolean, xs: T[]): T[] {
  const ret = []
  for (const x of xs)
    if (fn(x)) ret.push(x);
    else break;
  return ret;
}

export function peek<T>(xs: T[]): T {
  return xs[xs.length - 1]!;
}

export function range(a: number, b: number): number[] {
  return Array.from(new Array(b - a), (_, i) => i + a);
}

export function empty<T>(xs: T[]) {
  while (xs.length) xs.pop();
}

export function flatten<T>(xs: T[][]): T[] {
  return xs.length == 0 ? [] : xs.reduce((a, b) => a.concat(b));
}

export function id<T>(x: T): T {
  return x;
}

export function internal_assertion(cond: () => boolean, message: string) {
  if (cond()) return;
  throw Error(`Internal Assertion Error: ${message}`);
}

export function assertion(
  cond: () => boolean,
  errmsg: string | Runtime.DSLError
) {
  if (cond()) return;
  if (typeof errmsg == "object") {
    throw errmsg;
  }
  // TODO remove this eventually
  throw Error(`Assertion Error: ${errmsg}`);
}

export function zip<U, V>(xs: U[], ys: V[]): [U, V][] {
  return xs.length < ys.length
    ? xs.map((v, i) => [v, ys[i]!])
    : ys.map((v, i) => [xs[i]!, v]);
}
