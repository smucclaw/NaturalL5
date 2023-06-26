import { LiteralType, UserInputLiteral } from "./AstNode";

export type Continue_t = (x: LiteralType) => void;

export interface CallbackEvent {
  tag: string;
}

export type InputEvent = EventValidate | EventInvalidate | EventRequest;

export type OutputEvent = EventResult | EventWaiting;

export class EventInvalidate {
  tag = "EventInvalidate";
}

export class EventValidate {
  tag = "EventValidate";
}

export class EventRequest {
  tag = "EventRequest";
  constructor(readonly cont: Continue_t) {}
}

export class EventResult {
  tag = "EventResult";
  constructor(readonly result: LiteralType) {}
}

export class EventWaiting {
  tag = "EventWaiting";
  constructor(readonly userinput: UserInputLiteral) {}
}
