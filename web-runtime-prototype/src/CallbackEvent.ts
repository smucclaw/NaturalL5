import { LiteralType } from "./AstNode";

export type Continue_t = (x: LiteralType) => void;

export interface CallbackEvent {
  tag: string;
}

export type InputEvent = EventInvalidate | EventRequest;

export type OutputEvent = EventResult | EventUndefined;

export class EventInvalidate {
  tag = "EventInvalidate";
}

export class EventRequest {
  tag = "EventRequest";
  constructor(readonly cont: Continue_t) {}
}

export class EventResult {
  tag = "EventResult";
  constructor(readonly result: LiteralType) {}
}

export class EventUndefined {
  tag = "EventUndefined";
  constructor(readonly message: string) {}
}
