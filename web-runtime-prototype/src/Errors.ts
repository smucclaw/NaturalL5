import { Token } from "./Token";

export type Error = SyntaxError | InternalAssertion | TypeError;

export class SourceAnnotation {
  constructor(readonly tokens: Token[], readonly annotation?: string) {}

  toString(source: string): string {
    // TODO
    return source.slice(0,10);
  }
}

export abstract class ErrorWithSource {
  tag = "ErrorWithSource";
  constructor(
    readonly annotation: SourceAnnotation,
    readonly message?: string
  ) {}

  toString(source: string): string {
    return [
        `${this.tag}: ${this.message}`,
        this.annotation.toString(source)
    ].join("\n")
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
