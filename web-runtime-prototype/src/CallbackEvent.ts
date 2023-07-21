import {
  Expression,
  LiteralType,
  UserInputLiteral,
  Name,
} from "./AstNode";
import { DSLError } from "./Errors";
import { Token } from "./Token";
import { TraceNode } from "./TraceAst";

export type Continue_t = (x: LiteralType) => void;

export interface CallbackEvent {
  tag: string;
}

export type InputEvent = EventValidate | EventInvalidate | EventRequest;

export type OutputEvent =
  | EventResult
  | EventWaiting
  | ErrorEvent;

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
  public trace?: TraceNode;
  constructor(readonly result: LiteralType) {}
}

export class EventWaiting implements CallbackEvent {
  tag = "EventWaiting";
  constructor(readonly userinputs: UserInputLiteral[]) {}
}

export class ErrorEvent implements CallbackEvent {
  tag = "ErrorEvent";
  constructor(readonly error: DSLError) {}
  get message(): string {
    return this.error.message;
  }
}
