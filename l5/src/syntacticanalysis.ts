import * as Ast from "./ast";

/**
 * Syntactic analysis performs the following
 * - Determining the types of all the relational identifiers
 * - Perform type checking
 * - Resolving all usage of relational identifiers to the instances that were declared
 *    - All relational identifiers become new arguments
 * - Resolving the index of each identifier in the environment
 */


