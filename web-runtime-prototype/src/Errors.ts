import { Token } from "./Token";
import { internal_assertion, range } from "./utils";

export type Error = SyntaxError | InternalAssertion | TypeError;

export class SourceAnnotation {
  constructor(readonly tokens: Token[], readonly annotation?: string) {
    internal_assertion(() => tokens.length > 0, 
        "SourceAnnotation must be initialised with tokens. Given `tokens` has length 0");
  }

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

  private source_lines(source: string): string[] {
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
      lines.push("");
    }
    return lines.join("\n");
  }

  toString(source: string): string {
    const line_token = [...this.lines_to_tokens.entries()];
    const source_lines = this.source_lines(source);
    line_token.sort((a,b) => a[0] - b[0]);
    const minline = Math.min(line_token[0]![0] - 2, 1);
    const maxline = Math.max(line_token[line_token.length - 1]![0] + 2, source_lines.length);

  }
}

export abstract class ErrorWithSource {
  tag = "ErrorWithSource";
  constructor(
    readonly annotation?: SourceAnnotation,
    readonly message?: string
  ) {}

  toString(source: string): string {
    return [
      `${this.tag}: ${this.message}`,
      "",
      this.annotation.toString(source),
    ].join("\n");
  }
}

export class SyntaxError extends ErrorWithSource {
  override tag = "SyntaxError";
}

export class InternalAssertion extends ErrorWithSource {
  override tag = "InternalAssertion";
}

export class TypeError extends ErrorWithSource {
  override tag = "TypeError";
}

export class ErrorContext {
  constructor(readonly source: string, readonly errors: Error[]) {}

  static empty(source: string): ErrorContext {
    return new ErrorContext(source, []);
  }

  add_error(err: Error) {
    this.errors.push(err);
  }

  error_string(err: Error): string {
    return err.toString(this.source);
  }
}
