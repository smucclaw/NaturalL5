import { Token } from "./token";
import { range } from "./utils";

export class SourceAnnotation {
  constructor(readonly tokens: Token[]) {}

  private get lines_to_tokens(): Map<number, Token[]> {
    const res = new Map();
    this.tokens.forEach((t) => {
      if (res.get(t.line) == undefined) {
        res.set(t.line, []);
      }
      res.get(t.line).push(t);
    });
    return res;
  }

  private static source_lines(source: string): string[] {
    return source.split("\n");
  }

  private line_to_string(lineno: number, linestr: string): string {
    const lines = [`${lineno}`.padEnd(4) + "|" + linestr];
    const toks = this.lines_to_tokens.get(lineno);
    if (toks != undefined) {
      const annotate = [..." ".repeat(linestr.length)];
      toks.forEach((t) => {
        const [l, h] = [t.begin_col - 1, t.end_col - 1];
        range(l, h).map((i) => (annotate[i] = "^"));
      });
      lines.push("     " + annotate.join(""));
    }
    return lines.join("\n");
  }

  toString(source: string): string {
    if (this.tokens.length == 0) return "";
    const line_token = [...this.lines_to_tokens.entries()];
    const source_lines = SourceAnnotation.source_lines(source);
    line_token.sort((a, b) => a[0] - b[0]);
    const minline = Math.max(line_token[0]![0] - 2, 1);
    const maxline = Math.min(
      line_token[line_token.length - 1]![0] + 3,
      source_lines.length + 1
    );
    return range(minline, maxline)
      .map((lineno) => this.line_to_string(lineno, source_lines[lineno - 1]!))
      .join("\n");
  }
}

export abstract class L5Error extends Error {
  tag = "L5Error";
  constructor(
    readonly source: string,
    readonly annotation?: SourceAnnotation,
    readonly errmsg?: string
  ) {
    super();
  }

  override get message(): string {
    return [
      `${this.tag}: ${this.errmsg}`,
      "",
      this.annotation == undefined ? "" : this.annotation.toString(this.source),
    ].join("\n");
  }
}

export class L5SyntaxError extends L5Error {
  override tag = "SyntaxError";
}

export class L5InternalAssertion extends L5Error {
  override tag = "InternalAssertion";
}

export class L5TypeError extends L5Error {
  override tag = "TypeError";
}

export class ErrorContext {
  constructor(readonly source: string) {}
}
