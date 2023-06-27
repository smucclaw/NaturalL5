import { LiteralType, UserInputLiteral } from "./AstNode";
import { Error } from "./Errors";

export type Continue_t = (x: LiteralType) => void;

export interface CallbackEvent {
  tag: string;
}

export type InputEvent = EventValidate | EventInvalidate | EventRequest;

export type OutputEvent = EventResult | EventWaiting;

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

export class ErrorEvent implements CallbackEvent {
  tag = "ErrorEvent";
  constructor(readonly error: Error) {};
}
