import { internal_assertion } from "./utils";
import * as Ast from "./AstNode";

class Frame {
  public frame_items: [string, Ast.AstNode][];

  constructor(frame_items?: [string, Ast.AstNode][]) {
    this.frame_items = frame_items ?? [];
  }

  lookup(name:Ast.ResolvedName): Ast.AstNode {
    const query_sym = name.sym;
    const frame_pos = name.env_pos[1];
    const lookup = this.frame_items[frame_pos];
    internal_assertion(() => lookup != undefined,
      `Variable lookup frame out of range. `
      + `frame_length=${this.frame_items.length}, `
      + `query_pos=${frame_pos}`);
    const [sym, result] = lookup!;
    internal_assertion(
      () => query_sym == sym,
      `Variable lookup symbol mismatch. `
      + `query=${query_sym}, result=${sym}`);
    return result;
  }
}

// TODO: Add builtins
const global_frame: Frame = new Frame([]);

export class Environment {
  public frames: Frame[];

  constructor(frames?: [Frame]) {
    this.frames = frames ?? [global_frame];
  }

  lookup(name:Ast.ResolvedName): Ast.AstNode {
    const frame_number = name.env_pos[0];
    const frame = this.frames[frame_number];
    internal_assertion(() => frame != undefined,
      `Variable lookup env out of range. `
      + `env_length=${this.frames.length}, `
      + `query_pos=${frame_number}`);
    return frame!.lookup(name);
  }
}
