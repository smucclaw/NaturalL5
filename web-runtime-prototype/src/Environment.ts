import { internal_assertion } from "./utils";
import * as Ast from "./AstNode";

class FrameSymbol {
  constructor(readonly sym: string, readonly ast: Ast.AstNode) {}
  toString = () => `${this.sym}->${this.ast}`;
}

export class Frame {
  readonly frame_items: Map<number, FrameSymbol>;

  constructor(frame_items?: Map<number, FrameSymbol>) {
    this.frame_items = frame_items ?? new Map();
  }

  lookup(name: Ast.ResolvedName): Ast.AstNode {
    const query_sym = name.sym;
    const frame_pos = name.env_pos[1];
    const lookup = this.frame_items.get(frame_pos);
    internal_assertion(
      () => lookup != undefined,
      `Variable lookup frame out of range. ` +
        `frame=${this}, ` +
        `query_pos=${frame_pos}`
    );
    const [sym, ast] = [lookup!.sym, lookup!.ast];
    internal_assertion(
      () => query_sym == sym,
      `Variable lookup symbol mismatch. ` + `query=${query_sym}, result=${sym}`
    );
    return ast;
  }

  copy(): Frame {
    return new Frame(new Map(this.frame_items));
  }

  set_var(name: Ast.ResolvedName, result: Ast.LiteralType) {
    const frame_pos = name.env_pos[1];
    const lookup = this.frame_items.get(frame_pos);
    internal_assertion(
      () => lookup != undefined,
      `Variable setting frame out of range. ` +
        `frame=${this}, ` +
        `query_pos=${frame_pos}`
    );
    internal_assertion(
      () => lookup!.sym == name.sym,
      `Variable setting symbol mismatch. ` +
        `query=${name.sym}, result=${lookup!.sym}`
    );
    this.frame_items.set(
      frame_pos,
      new FrameSymbol(name.sym, new Ast.Literal(result))
    );
  }

  add_var(name: Ast.ResolvedName, expr: Ast.Expression) {
    internal_assertion(
      () => !this.frame_items.has(name.env_pos[1]),
      `Attempted to add variable that exists. name=${name}, frame=${this}`
    );
    this.frame_items.set(name.env_pos[1], new FrameSymbol(name.sym, expr));
  }

  toString = () => {
    let symstr = "";
    this.frame_items.forEach((v, k) => (symstr += `${k}:${v};`));
    return `[{${symstr}}]`;
  };
}

// TODO: Add builtins
// global_frame will contain all datastructues
// that relates to the questions.
// This will be shared across all environments created.

export class Environment {
  readonly frames: Frame[];

  constructor(readonly global_frame: Frame, frames?: Frame[]) {
    this.frames = frames ?? [];
  }

  lookup(name: Ast.ResolvedName): Ast.AstNode {
    const frameidx = name.env_pos[0];
    let frame;
    if (frameidx == "global") {
      frame = this.global_frame;
    } else {
      const x = this.frames[frameidx];
      internal_assertion(
        () => x != undefined,
        `Variable lookup env out of range. ` +
          `env_length=${this.frames.length}, ` +
          `query_pos=${frameidx}`
      );
      frame = x!;
    }
    return frame.lookup(name);
  }

  copy(): Environment {
    return new Environment(
      this.global_frame,
      this.frames.map((f) => f.copy())
    );
  }

  set_var(name: Ast.ResolvedName, result: Ast.LiteralType): Environment {
    const pos = name.env_pos;
    const new_env = this.copy();
    const frameidx = pos[0];
    let frame;
    if (frameidx == "global") {
      frame = new_env.global_frame;
    } else {
      const x = new_env.frames[frameidx];
      internal_assertion(
        () => x != undefined,
        `Variable setting env out of range. ` +
          `env_length=${this.frames.length}, ` +
          `query_pos=${pos}`
      );
      frame = x!;
    }
    frame.set_var(name, result);
    return new_env;
  }

  add_var(name: Ast.ResolvedName, expr: Ast.Expression): Environment {
    const new_env = this.copy();
    const frames = new_env.frames;
    const frameidx = name.env_pos[0];
    let frame;
    if (frameidx == "global") {
      frame = new_env.global_frame;
    } else {
      internal_assertion(
        () => frameidx == frames.length - 1,
        `Adding variable outside of current scope. name=${name}, env=${new_env}`
      );
      frame = frames[frames.length - 1]!;
    }
    frame.add_var(name, expr);
    return new_env;
  }

  add_frame(): Environment {
    const new_frames = this.frames.map((f) => f.copy());
    new_frames.push(new Frame(new Map()));
    return new Environment(this.global_frame, new_frames);
  }

  remove_frame(): Environment {
    internal_assertion(
      () => this.frames.length > 0,
      "Removing frame from an empty environment."
    );
    return new Environment(
      this.global_frame,
      this.frames.slice(0, this.frames.length - 1).map((f) => f.copy())
    );
  }

  toString = () =>
    `[\n  global: ${this.global_frame}\n  rest:\n${this.frames
      .map((f) => `    ${f.toString()};\n`)
      .join("")}]`;
}
