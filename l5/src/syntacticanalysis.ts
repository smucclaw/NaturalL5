/**
 * Syntactic analysis performs the following
 * - Determining the types of all the relational identifiers
 * - Perform type checking
 * - Resolving all usage of relational identifiers to the instances that were declared
 *    - All relational identifiers become new arguments
 * - Resolving the index of each identifier in the environment
 */

import {
  AstNode,
  AstTransformer,
  Expression,
  Identifier,
  Literal,
  Program,
  RelationalIdentifier,
  RelationalInstancing,
  TypeDefinition,
  TypeInstancing,
  UnitLiteral,
} from "./ast";
import { ErrorContext, SourceAnnotation } from "./errors";
import { Maybe, zip } from "./utils";

export type EnvIndex = [number, number];

export class ResolvedRelationalIdentifier extends RelationalIdentifier {
  override tag = "ResolvedRelationalIdentifier";
  constructor(rid: RelationalIdentifier, readonly literals: UnitLiteral[]) {
    super(rid.template, rid.instances, rid._tokens);
  }

  get typesig(): string[] {
    return this.literals.map((l) => l.typename);
  }

  equal(other: ResolvedRelationalIdentifier) {
    return zip(this.template, other.template).every((v) => v[0] == v[1])
      && zip(this.typesig, other.typesig).every((v) => v[0] == v[1]);
  }
}

export class ResolveTransformer extends AstTransformer {
  readonly types_declared: Identifier[] = [];
  readonly env: [ResolvedRelationalIdentifier | Identifier, Expression][] = [];

  constructor(readonly errctx: ErrorContext) {
    super();
  }

  private find_env(
    node: ResolvedRelationalIdentifier | Identifier
  ): Maybe<number> {
    let retidx = -1;
    const exists = this.env.find((e, idx) => {
      retidx = idx;
      return (
        e[0].tag == node.tag &&
        (e[0].tag == "Identifier"
          ? (e[0] as Identifier).identifier == (node as Identifier).identifier
          : (e[0] as ResolvedRelationalIdentifier).equal(
              node as ResolvedRelationalIdentifier
            ))
      );
    });
    return exists == undefined ? undefined : retidx;
  }

  override transform_TypeDefinition(node: TypeDefinition): AstNode {
    const typename = node.typename;
    const exists = this.types_declared.find(
      (t) => t.identifier == typename.identifier
    );
    if (exists != undefined)
      throw this.errctx.createError(
        "TypeError",
        "Redeclaration of type.",
        new SourceAnnotation(node.src.concat(exists.src))
      );
    this.types_declared.push(typename);
    return node;
  }

  override transform_TypeInstancing(node: TypeInstancing): AstNode {
    const typename = node.typename;
    if (
      this.types_declared.find((t) => t.identifier == typename.identifier) ==
      undefined
    ) {
      throw this.errctx.createError(
        "TypeError",
        "Type does not exists.",
        new SourceAnnotation(typename.src)
      );
    }

    const exists = this.find_env(node.variable);
    if (exists != undefined) {
      throw this.errctx.createError(
        "TypeError",
        "Instance has been redeclared.",
        new SourceAnnotation(node.src.concat(this.env[exists]![0].src))
      );
    }

    this.env.push([
      node.variable,
      new Literal(
        new UnitLiteral(typename.identifier, node.variable.identifier),
        node.variable._tokens
      ),
    ]);
    return node;
  }

  override transform_RelationalInstancing(node: RelationalInstancing): AstNode {
    const rel = node.relation;
    const literals: UnitLiteral[] = [];
    rel.instances.forEach((i) => {
      const exists = this.find_env(i);
      if (exists == undefined) {
        throw this.errctx.createError(
          "TypeError",
          "Instance hasn't been declared",
          new SourceAnnotation(i.src)
        );
      }
      const instance = this.env[exists]!;
      if (!(instance[1] instanceof UnitLiteral)) {
        throw this.errctx.createError(
          "TypeError",
          `Relational identifiers cannot be templated with ${typeof instance[1]}. ` +
            `Expected UnitLiteral.`
        );
      }
      literals.push(instance[1]);
    });
    const resolved = new ResolvedRelationalIdentifier(rel, literals);
    this.env.push([resolved, this.generic_transform(node.value) as Expression]);
    return node;
  }
}

export function synctactic_analysis(node: Program, errctx: ErrorContext) {
  node = new ResolveTransformer(errctx).transform_Program(node) as Program;
  return node;
}
