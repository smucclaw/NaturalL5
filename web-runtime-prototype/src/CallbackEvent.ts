import { AstNodeAnnotated, LiteralType, UserInputLiteral } from "./AstNode";
import { Token } from "./Token";

export type Continue_t = (x: LiteralType) => void;

export interface CallbackEvent {
  tag: string;
}

export class SourceAnnotation {
  constructor(readonly tokens: Token[], readonly annotation?: string) {}
}

export abstract class ErrorWithSource implements CallbackEvent {
  tag = "ErrorWithSource";
  constructor(
    readonly annotations: SourceAnnotation[],
    readonly message?: string
  ) {}
}

export type InputEvent = EventValidate | EventInvalidate | EventRequest;

export type OutputEvent = EventResult | EventWaiting;

export type ErrorEvent =
  | EventSyntaxError
  | EventInternalAssertion
  | EventTypeError;

export class EventInvalidate implements CallbackEvent {
  tag = "EventInvalidate";
}

export class EventValidate implements CallbackEvent {
  tag = "EventValidate";
}

export class EventRequest implements CallbackEvent {
  tag = "EventRequest";
  constructor(readonly cont: Continue_t) {}
}

export class EventResult implements CallbackEvent {
  tag = "EventResult";
  constructor(readonly result: LiteralType) {}
}

export class EventWaiting implements CallbackEvent {
  tag = "EventWaiting";
  constructor(readonly userinput: UserInputLiteral) {}
}

export class EventSyntaxError extends ErrorWithSource {
  override tag = "EventSyntaxError";
}

export class EventInternalAssertion extends ErrorWithSource {
  override tag = "EventInternalAssertion";
}

export class EventTypeError extends ErrorWithSource {
  override tag = "EventTypeError";
}
