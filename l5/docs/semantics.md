# Overview

> TODO: Examples

An L5 program encodes contracts as an extension of Kripke semantics. This document presents an informal interpretation of the various constructs in L5.

## Components

An L5 program is broken down into several main components:

1. Contract Declaration + Instancing
3. Concrete Evaluation + Instancing
4. (Stretch) Goal Specialisation
5. (Stretch) Contract Annotation

### Contract Declaration

Contract Declaration together with instancing serves to declare the contract. The main construct of Contract Declaration is Regulative Rules. Regulative Rules consist of a set of constraints and an Action to be taken. Furthermore, Regulative Rules define the conditions for the invocation of other Regulative Rules.

### Instancing

Instancing refers to the declaration of instances of types, as well as relations on declared types (see below). Instancing can be used in Contract Declaration and also used in Concrete Evaluation (below). 

Contract Declaration works on abstract types. Primitive types (e.g., Integer, Float, Bool) which aren't declared by instancing are referred to as _Symbolic Variables_ and are treated by the backends as such.

### Concrete Evaluation

Concrete Evaluation refers to the invocation of Regulative Rules on instanced types. This represents the evaluation of the contract on a specific case.

### (Stretch) Goal-based Specialisation

Different stakeholders of a contract have different desired outcomes during the evaluation of a contract. E.g., A civilian will consider going to jail as undesirable while a judge will not. L5 should support the conditional inclusion of Regulative Rules that delineate the desired outcomes of different stakeholders.

### (Stretch) Contract Annotation

TODO

## Potential Backends

We consider here only two backends that we intend to build as a demonstration of L5.

1. Contradictions Backend
2. Evaluation Backend

It's important to note that a given backend might not utilise all components of an L5 program. 

### Contradictions Backend

Our goal for this backend is to automatically determine unsatisfiable states in all possible contract evaluations.

The Contradictions Backend only utilises the Contract Declaration (and perhaps Goal Specialisation) and a subset of the instancing as the Contradictions Backend should not only focus on a specific instance of the contract's evaluation; but rather, all possible evaluations of the contract.

### Evaluation Backend

Our goal for this backend is to serve a dynamically generated and reactive web form that asks the user questions to concretise all symbolic variables and outputs the result of the contract's evaluation.

The Evaluation Backend will, on the other hand, utilise all components.

# L5 Constructs

## Regulative Rules

Regulative rules can be _public_ or _private_. Public regulative rules are invoked at all times, taking an action or satisfying constraints related to the public regulative rules triggers the invocation of private Regulative Rules.

```ebnf
public_regulative_rule := "$" regulative_rule
private_regulative_rule := "*" regulative_rule
```

Regulative rules consist of the following:
- Regulative Label and type signature
- Regulative constraint
- Deontic temporal action
- Regulative rule conclusions

### Regulative Label

A Regulative Label is an identifier for a regulative rule, that is used during regulative rule invocation.

### Regulative Rule Arguments

Regulative rules act on a set of instanced types, which is defined via `regulative_typed_arg_decl`.

If the argument contains a `|`, separating different `arg_label`s, e.g., `a|b: C`, this indicates that `a` and `b` could potentially be the same instance. Otherwise, each `regulative_typed_arg_decl` is assumed to refer to different instances.

### Regulative Constraint and Action

A Regulative Rule is associated with either a Regulative Constraint, a Temporal Deontic Action or both. Satisfying the constraint and/or performing the deontic action results in a respective Regulative Conclusion (below).

In this sense, both the constraint and action block the invocation of further regulative rules: Both have to be evaluated before the latter can be invoked.

#### Regulative Constraint

`regulative_constraint` is an expression on the instanced types declared in the arguments, global constants, and `templated_identifiers` (below) that evaluates to a boolean.

#### Temporal Deontic Action

`deontic_temporal_action` is a deontic action associated with the regulative rule. This consists of a deontic (`PERMITTED` or `OBLIGATED`) and an `action_expr`. `action_expr` is an expression over the instanced types declared in the arguments, global constants, and `templated_identifiers` (below) that evaluates to a boolean. Evaluation to `true` indicates that the action is taken. The deontic action is always taken to be instantaneous.

The deontic action can also be associated with a `temporal_constraint`, which defines a period at which the start of the action has to begin. The constraint can be absolute (e.g., before/after a certain date), or relative, at which the relative time will begin counting from when the Regulative Constraint evaluates to `true`.

The deontic action can also be associated with an `instance_tag`, which assigns an instanced type to the action. This mechanism assigns blame, where the `instance_tag` is expected to be responsible for the action taken.

### Regulative Rule Conclusions

Evaluation of the deontic action and constraint present 4 cases
1. Constraint fulfilled and action taken
2. Constraint fulfilled and action not taken
1. Constraint not fulfilled and action taken
1. Constraint not fulfilled and action not taken

For each of these cases, a Regulative Rule Conclusion can be defined to indicate a list of regulative rules to be invoked.

The EBNF permits a `deontic_temporal_action` as a conclusion, which is syntactic sugar for a private regulative rule with the same type signature as the current regulative rule, with no constraints and conclusions, but with the above-mentioned action as its deontic temporal action.

Regulative rules are declared on abstract types. An invocation will evaluate a regulative rule on instanced types. In a regulative rule conclusion, the regulative rule invocations have to be invoked on instanced types defined as expressions over the instanced types declared in the arguments, global constants, and `templated_identifiers` (below).

Regulative rules can invoke other regulative rules including itself. This enables the modeling of repetitive contracts (E.g., this contract automatically renews unless the tenant pulls out.).

### Contract Breach

A contract breach is defined as:
1. An `OBLIGATED` action is not taken and there isn't a Regulative Rule Conclusion to handle the case encountered.
2. A `PERMITTED` action is taken but the Regulative Constraint isn't satisfied, and there isn't a Regulative Rule Conclusion to handle the case encountered.

## Constitutive Definitions

Constitutive Definitions are macros for defining expressions. Constitutive Definitions are used in an expression as a way to modularise definitions of expressions. Unlike regular closures, Constitutive Definitions aren't first-class citizens. This decision is deliberate to make L5 amendable to analysis.

```ebnf
constitutive_definition :=
    "DEFINE" constitutive_label "::" typed_arg_decl ("," typed_arg_decl )
        "->" expression

constitutive_definition_invocation := constitutive_label "(" expression ("," expression) ")"
```

Constitutive definitions define expressions in terms of their arguments, the globals and templated identifiers (below), which are abstract types and can be invoked upon instanced types. Constitutive definitions can call other constitutive definitions, but cannot be recursively defined. The latter is also deliberate to make L5 amendable to analysis. 

## Templated Identifiers

Templated identifiers follow a similar syntax to format strings. 

```
-- tenant: Person
-- homeowner: Person
-- n: Integer
"{tenant} pays rent to {homeowner} at Month {n}"
```

Templated identifiers model _relations_. E.g., the above asks if `(tenant, homeowner, n)` is in the relation `"%1 pays rent to %2 at Month %3"`, a subset of `Person × Person × Integer`. A templated identifier always evaluates to a boolean depending on if the element is inside the relation.

# Toolchain

TODO

TODO: Update documentation according to further discussion in #21

# Goals

These goals are references Tom Hvitved's Ph.D. Dissertation: **Contract Formalisation and Modular Implementation of Domain-Specific Languages**.

1. Contract model, contract language, and formal semantics.
2. Contract participants.
3. (Conditional) commitments.
4. Absolute temporal constraints.
5. Relative temporal constraints.
6. Reparation clauses.
7. Instantaneous and continuous actions.
8. Potentially infinite and repetitive contracts.
9. Time-varying, external dependencies (observables).
10. History-sensitive commitments.
11. In-place expressions.
12. Parametrised contracts.
13. Isomorphic encoding.
14. Run-time monitoring.
15. Blame assignment.
16. Amenability to (compositional) analysis.