import { internal_assertion } from "./utils";
import * as Ast from "./AstNode";
import { Maybe, INDENT } from "./utils";

class FrameSymbol {
  constructor(readonly sym: string, readonly ast: Ast.AstNode) {}
  toString = (i = 0) => `${this.sym} :: ${this.ast.toString(i)}`;
  debug = (i = 0) => `${this.sym} :: ${this.ast.debug(i)}`;
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
        `query_pos=${name}`
    );
    const [sym, ast] = [lookup!.sym, lookup!.ast];
    internal_assertion(
      () => query_sym == sym,
      `Variable lookup symbol mismatch. ` + `query=${query_sym}, result=${sym}`
    );
    return ast;
  }

  lookup_name(name: Ast.Name): Maybe<number> {
    for (const [p2, sym] of this.frame_items.entries()) {
      if (sym.sym == name.sym) return p2;
    }
    return undefined;
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

  toString = (i = 0) => {
    const symstr: string[] = [];
    this.frame_items.forEach((v) => symstr.push(`${v.toString(i + 1)}`));
    return `[\n${INDENT.repeat(i + 1)}${symstr.join(
      `,\n${INDENT.repeat(i + 1)}`
    )}\n]`;
  };

  debug = (i = 0) => {
    const symstr: string[] = [];
    this.frame_items.forEach((v, k) => symstr.push(`${k}:${v.debug(i + 1)};`));
    return `[\n${INDENT.repeat(i + 1)}${symstr.join(
      `,\n${INDENT.repeat(i + 1)}`
    )}\n]`;
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

  static empty(): Environment {
    return new Environment(new Frame(new Map()));
  }

  mutable_subenv(frame_level: number): Environment {
    return new Environment(
      this.global_frame,
      this.frames.slice(0, frame_level)
    );
  }

  lookup_frame(frameidx: number): Frame {
    if (frameidx >= this.frames.length) {
      internal_assertion(
        () => frameidx == this.frames.length,
        `Frame lookup out of bounds.` +
          `env_length=${this.frames.length}, ` +
          `query_pos=${frameidx}`
      );
      return this.global_frame;
    }
    const x = this.frames[this.frames.length - 1 - frameidx];
    internal_assertion(
      () => x != undefined,
      `Variable lookup out of bounds. ` +
        `env_length=${this.frames.length}, ` +
        `query_pos=${frameidx}`
    );
    return x!;
  }

  lookup(name: Ast.ResolvedName): Ast.AstNode {
    const frameidx = name.env_pos[0];
    return this.lookup_frame(frameidx).lookup(name);
  }

  lookup_name(name: Ast.Name): [number, number] {
    const l = this.frames.length - 1;
    let p1 = 0;
    let p2;
    while (p1 <= l) {
      p2 = this.frames[l - p1]!.lookup_name(name);
      if (p2 != undefined) return [p1, p2];
      p1 += 1;
    }
    p2 = this.global_frame.lookup_name(name);
    if (p2 != undefined) return [l + 1, p2];
    internal_assertion(() => false, `${name} not in env. \nEnv = ${this}`);
    throw null;
  }

  copy(): Environment {
    return new Environment(
      this.global_frame,
      this.frames.map((f) => f.copy())
    );
  }

  set_var_mut(name: Ast.ResolvedName, result: Ast.LiteralType) {
    const pos = name.env_pos;
    const frameidx = pos[0];
    this.lookup_frame(frameidx).set_var(name, result);
  }

  add_var_mut(name: Ast.ResolvedName, expr: Ast.Expression) {
    const frameidx = name.env_pos[0];
    this.lookup_frame(frameidx).add_var(name, expr);
    return this;
  }

  add_frame_mut(): Environment {
    const new_frames = this.frames.slice(0, this.frames.length);
    new_frames.push(new Frame(new Map()));
    return new Environment(this.global_frame, new_frames);
  }

  is_global_scope(): boolean {
    return this.frames.length == 0;
  }

  is_global_var(name: Ast.ResolvedName): boolean {
    return name.env_pos[0] == this.frames.length;
  }

  debug = (i = 0) =>
    `ENV[\nglobal:\n${this.global_frame.debug(i)}\nrest:\n${this.frames
      .map((f) => `${f.debug(i)};`)
      .join("\n")}]`;

  toString = (i = 0) =>
    `ENV[\nglobal:\n${this.global_frame.toString(i)}\nrest:\n${this.frames
      .map((f) => `${f.toString(i)};`)
      .join("\n")}]`;
}
