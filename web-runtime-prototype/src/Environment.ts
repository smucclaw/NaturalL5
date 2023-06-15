import {Maybe} from "./utils";
import * as Ast from "./AstNode";

class Frame {
  public symbol_map: { [sym: string]: Ast.AstNode };

  constructor(symbol_map?: { [sym: string]: Ast.AstNode }) {
    this.symbol_map = symbol_map ?? {};
  }

  lookup(sym: string): Maybe<Ast.AstNode> {
    return this.symbol_map[sym];
  }
}

// TODO: Add builtins
const global_frame: Frame = new Frame({});

export class Environment {
  public frames: Frame[];

  constructor(frames?: [Frame]) {
    this.frames = frames ?? [global_frame];
  }

  lookup(sym: string): Maybe<Ast.AstNode> {
    const helper = (i: number): Maybe<Ast.AstNode> => {
      const frame = this.frames[this.frames.length - i];
      if (frame == undefined) return undefined;
      const res = frame.lookup(sym);
      if (res == undefined) return helper(i + 1);
      return res;
    };
    return helper(1);
  }
}
