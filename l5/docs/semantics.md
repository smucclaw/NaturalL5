# Overview

> TODO: Examples

An L5 program encodes contracts as an extension of Kripke semantics. This document presents an informal interpretation of the various constructs in L5.

## Components

An L5 program is broken down into several main components:

1. Contract Declaration + Instancing
3. Concrete Evaluation + Instancing
4. (Stretch) Goal Specialisation

### Contract Declaration

Contract Declaration together with instancing serves to declare the contract. The main construct of Contract Declaration is Regulative Rules. Regulative Rules consist of a set of constraints and an Action to be taken. Furthermore, Regulative Rules define the conditions for the invocation of other Regulative Rules.

Contract Declaration consists of a set of _global_ Regulative Rules, which are simultaneously invoked. Taking an action or satisfying constraints triggers the invocation of other _local_ Regulative Rules.

### Instancing

Instancing refers to the partial declaration of instances of types. Instancing can be used in Contract Declaration to store global variables and also used in Concrete Evaluation (below). 

Contract Declaration works on abstract types. Primitive types (e.g., Integer, Float, Bool) which aren't declared by instancing are referred to as _Symbolic Variables_ and are treated by the backends as such.

### Concrete Evaluation

Concrete Evaluation refers to the invocation of Regulative Rules on (partially) instanced types. This represents the evaluation of the contract on a specific case.

### (Stretch) Goal-based Specialisation

Different stakeholders of a contract have different desired outcomes during the evaluation of a contract. E.g., A civilian will consider going to jail as undesirable while a judge will not. L5 should support the conditional inclusion of Regulative Rules that delineate the desired outcomes of different stakeholders.

## Potential Backends

We consider here only two backends that we intend to build as a demonstration of L5.

1. Contradictions Backend
2. Evaluation Backend

It's important to note that a given backend might not utilise all components of an L5 program. 

The Contradictions Backend only utilises the Contract Declaration (and perhaps Goal Specialisation) and a subset of the instancing as the Contradictions Backend should not only focus on a specific instance of the contract's evaluation; but rather, all possible evaluations of the contract.

The Evaluation Backend will, on the other hand, utilise all components.

### Contradictions Backend

Our goal for this backend is to automatically determine unsatisfiable states in all possible contract evaluations.

### Evaluation Backend

Our goal for this backend is to serve a dynamically generated and reactive web form that asks the user questions to concretise all symbolic variables and outputs the result of the contract's evaluation.

# Goals

These goals are in reference to Tom Hvitved's Ph.D. Dissertation: **Contract Formalisation and Modular Implementation of Domain-Specific Languages**.

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