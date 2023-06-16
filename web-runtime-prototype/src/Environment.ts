import { internal_assertion } from "./utils";
import * as Ast from "./AstNode";

class FrameSymbol {
  constructor(readonly sym: string, readonly ast: Ast.AstNode) {}
  toString = () => `${this.sym}->${this.ast}`;
}

class Frame {
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

  set_var(name: Ast.ResolvedName, result: Ast.LiteralType): Frame {
    const frame_pos = name.env_pos[1];
    const frame_copy = this.copy();
    const lookup = frame_copy.frame_items.get(frame_pos);
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
    frame_copy.frame_items.set(
      frame_pos,
      new FrameSymbol(name.sym, new Ast.Literal(result))
    );
    return frame_copy;
  }

  add_var(name: Ast.ResolvedName, expr: Ast.Expression): Frame {
    const frame_copy = this.copy();
    internal_assertion(
      () => !frame_copy.frame_items.has(name.env_pos[1]),
      `Attempted to add variable that exists. name=${name}, frame=${frame_copy}`
    );
    frame_copy.frame_items.set(
      name.env_pos[1],
      new FrameSymbol(name.sym, expr)
    );
    return frame_copy;
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
const global_frame: Frame = new Frame(new Map());

export class Environment {
  readonly frames: Frame[];

  constructor(frames?: Frame[]) {
    this.frames = frames ?? [global_frame];
  }

  lookup(name: Ast.ResolvedName): Ast.AstNode {
    const frame_number = name.env_pos[0];
    const frame = this.frames[frame_number];
    internal_assertion(
      () => frame != undefined,
      `Variable lookup env out of range. ` +
        `env_length=${this.frames.length}, ` +
        `query_pos=${frame_number}`
    );
    return frame!.lookup(name);
  }

  copy(): Environment {
    return new Environment(this.frames.map((f) => f.copy()));
  }

  set_var(name: Ast.ResolvedName, result: Ast.LiteralType): Environment {
    const pos = name.env_pos;
    const new_env = this.copy();
    const frame = new_env.frames[pos[0]];
    internal_assertion(
      () => frame != undefined,
      `Variable setting env out of range. ` +
        `env_length=${this.frames.length}, ` +
        `query_pos=${pos}`
    );
    new_env.frames[pos[0]] = frame!.set_var(name, result);
    return new_env;
  }

  add_var(name: Ast.ResolvedName, expr: Ast.Expression): Environment {
    const new_env = this.copy();
    const frames = new_env.frames;
    // TODO: Check that name isn't declared and the variable is added to the latest frame.
    internal_assertion(
      () => name.env_pos[0] == frames.length - 1,
      `Adding variable outside of current scope. name=${name}, env=${new_env}`
    );
    const frame = frames[frames.length - 1]!;
    frames[frames.length - 1] = frame.add_var(name, expr);
    return new_env;
  }

  add_frame(): Environment {
    const new_frames = this.frames.map((f) => f.copy());
    new_frames.push(new Frame(new Map()));
    return new Environment(new_frames);
  }

  remove_frame(): Environment {
    internal_assertion(
      () => this.frames.length > 0,
      "Removing frame from an empty environment."
    );
    return new Environment(
      this.frames.slice(0, this.frames.length - 1).map((f) => f.copy())
    );
  }

  toString = () => `[\n${this.frames.map((f) => `  ${f.toString()};\n`)}]`;
}
