export type Maybe<T> = T | undefined;

export function internal_assertion(cond: ()=>boolean, message:string) {
    if (cond()) return;
    throw Error(`Internal Assertion Error: ${message}`)
}

export function zip<U,V>(xs:U[], ys:V[]): [U,V][] {
    return xs.length < ys.length 
        ? xs.map((v, i) => [v, ys[i]!])
        : ys.map((v, i) => [xs[i]!, v]);
}