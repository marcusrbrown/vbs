// ============================================================================
// FUNCTIONAL COMPOSITION UTILITIES
// ============================================================================

/**
 * Core functional composition utilities providing pipe(), compose(), curry(), and tap()
 * functions for elegant data transformation pipelines in the VBS application.
 *
 * These utilities maintain type safety through comprehensive TypeScript generics
 * and integrate seamlessly with VBS's functional factory architecture.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Generic function type that takes input of type T and returns output of type U
 */
export type UnaryFunction<T, U> = (arg: T) => U

/**
 * Function type that can take multiple arguments and return a value
 */
export type Func = (...args: any[]) => any

/**
 * Extracts the return type of a function
 */
export type ReturnType<T extends Func> = T extends (...args: any[]) => infer R ? R : never

/**
 * Extracts the parameters of a function as a tuple
 */
export type Parameters<T extends Func> = T extends (...args: infer P) => any ? P : never

/**
 * Curried function type that supports partial application
 */
export type Curried<TArgs extends readonly unknown[], TReturn> = TArgs extends readonly [
  infer THead,
  ...infer TTail,
]
  ? (arg: THead) => Curried<TTail, TReturn>
  : TReturn

// ============================================================================
// PIPE FUNCTION - LEFT TO RIGHT COMPOSITION
// ============================================================================

/**
 * Pipes the output of one function to the input of the next, left to right.
 * Enables intuitive data flow visualization in transformation chains.
 *
 * @param value - Initial value to pipe through functions
 * @returns Result after applying all functions to value
 *
 * @example
 * ```typescript
 * const result = pipe(
 *   'hello',
 *   (s: string) => s.toUpperCase(),
 *   (s: string) => `${s}!`,
 *   (s: string) => s.length
 * ) // Returns: 6
 * ```
 */
export function pipe<T>(value: T): T
export function pipe<T, A>(value: T, fn1: UnaryFunction<T, A>): A
export function pipe<T, A, B>(value: T, fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>): B
export function pipe<T, A, B, C>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
): C
export function pipe<T, A, B, C, D>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
): D
export function pipe<T, A, B, C, D, E>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
): E
export function pipe<T, A, B, C, D, E, F>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
): F
export function pipe<T, A, B, C, D, E, F, G>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
): G
export function pipe<T, A, B, C, D, E, F, G, H>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
): H
export function pipe<T, A, B, C, D, E, F, G, H, I>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
): I
export function pipe<T, A, B, C, D, E, F, G, H, I, J>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
  fn10: UnaryFunction<I, J>,
): J
export function pipe(value: any, ...fns: UnaryFunction<any, any>[]): any {
  return fns.reduce((acc, fn) => fn(acc), value)
}

// ============================================================================
// COMPOSE FUNCTION - RIGHT TO LEFT COMPOSITION
// ============================================================================

/**
 * Composes functions right to left, following mathematical composition semantics.
 * Useful when you want to read composition in mathematical order.
 *
 * @returns Composed function that applies all functions right to left
 *
 * @example
 * ```typescript
 * const transform = compose(
 *   (n: number) => n * 2,
 *   (s: string) => s.length,
 *   (s: string) => s.toUpperCase()
 * )
 * const result = transform('hello') // Returns: 10 (5 * 2)
 * ```
 */
export function compose<A>(fn1: UnaryFunction<A, A>): UnaryFunction<A, A>
export function compose<A, B>(fn1: UnaryFunction<A, B>): UnaryFunction<A, B>
export function compose<A, B, C>(
  fn1: UnaryFunction<B, C>,
  fn2: UnaryFunction<A, B>,
): UnaryFunction<A, C>
export function compose<A, B, C, D>(
  fn1: UnaryFunction<C, D>,
  fn2: UnaryFunction<B, C>,
  fn3: UnaryFunction<A, B>,
): UnaryFunction<A, D>
export function compose<A, B, C, D, E>(
  fn1: UnaryFunction<D, E>,
  fn2: UnaryFunction<C, D>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<A, B>,
): UnaryFunction<A, E>
export function compose<A, B, C, D, E, F>(
  fn1: UnaryFunction<E, F>,
  fn2: UnaryFunction<D, E>,
  fn3: UnaryFunction<C, D>,
  fn4: UnaryFunction<B, C>,
  fn5: UnaryFunction<A, B>,
): UnaryFunction<A, F>
export function compose<A, B, C, D, E, F, G>(
  fn1: UnaryFunction<F, G>,
  fn2: UnaryFunction<E, F>,
  fn3: UnaryFunction<D, E>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<B, C>,
  fn6: UnaryFunction<A, B>,
): UnaryFunction<A, G>
export function compose<A, B, C, D, E, F, G, H>(
  fn1: UnaryFunction<G, H>,
  fn2: UnaryFunction<F, G>,
  fn3: UnaryFunction<E, F>,
  fn4: UnaryFunction<D, E>,
  fn5: UnaryFunction<C, D>,
  fn6: UnaryFunction<B, C>,
  fn7: UnaryFunction<A, B>,
): UnaryFunction<A, H>
export function compose<A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<H, I>,
  fn2: UnaryFunction<G, H>,
  fn3: UnaryFunction<F, G>,
  fn4: UnaryFunction<E, F>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<C, D>,
  fn7: UnaryFunction<B, C>,
  fn8: UnaryFunction<A, B>,
): UnaryFunction<A, I>
export function compose<A, B, C, D, E, F, G, H, I, J>(
  fn1: UnaryFunction<I, J>,
  fn2: UnaryFunction<H, I>,
  fn3: UnaryFunction<G, H>,
  fn4: UnaryFunction<F, G>,
  fn5: UnaryFunction<E, F>,
  fn6: UnaryFunction<D, E>,
  fn7: UnaryFunction<C, D>,
  fn8: UnaryFunction<B, C>,
  fn9: UnaryFunction<A, B>,
): UnaryFunction<A, J>
export function compose<A, B, C, D, E, F, G, H, I, J, K>(
  fn1: UnaryFunction<J, K>,
  fn2: UnaryFunction<I, J>,
  fn3: UnaryFunction<H, I>,
  fn4: UnaryFunction<G, H>,
  fn5: UnaryFunction<F, G>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<D, E>,
  fn8: UnaryFunction<C, D>,
  fn9: UnaryFunction<B, C>,
  fn10: UnaryFunction<A, B>,
): UnaryFunction<A, K>
export function compose(...fns: UnaryFunction<any, any>[]): UnaryFunction<any, any> {
  return (value: any) => fns.reduceRight((acc, fn) => fn(acc), value)
}

// ============================================================================
// CURRY FUNCTION - PARTIAL APPLICATION UTILITY
// ============================================================================

/**
 * Transforms a function with multiple parameters into a sequence of functions,
 * each taking a single argument. Supports partial application for reusable predicates.
 *
 * @param fn - Function to be curried
 * @param arity - Number of arguments (optional, defaults to fn.length)
 * @returns Curried function supporting partial application
 *
 * @example
 * ```typescript
 * const add = (a: number, b: number, c: number) => a + b + c
 * const curriedAdd = curry(add)
 *
 * const add10 = curriedAdd(10)
 * const add10and5 = add10(5)
 * const result = add10and5(3) // Returns: 18
 *
 * // Or use it directly
 * const result2 = curriedAdd(1)(2)(3) // Returns: 6
 * ```
 */
export function curry<T extends Func>(fn: T, arity: number = fn.length): any {
  return function curried(...args: any[]): any {
    if (args.length >= arity) {
      return fn(...args)
    }
    return (...nextArgs: any[]) => curried(...args, ...nextArgs)
  }
}

// ============================================================================
// TAP FUNCTION - SIDE EFFECTS IN PIPELINES
// ============================================================================

/**
 * Executes a side effect function on a value and returns the original value unchanged.
 * Useful for logging, debugging, or triggering callbacks within pipelines.
 *
 * @param fn - Side effect function to execute (return value is ignored)
 * @returns Function that applies side effect and returns original value
 *
 * @example
 * ```typescript
 * const result = pipe(
 *   [1, 2, 3],
 *   tap(arr => console.log('Before filter:', arr)),
 *   (arr: number[]) => arr.filter(n => n > 1),
 *   tap(arr => console.log('After filter:', arr)),
 *   (arr: number[]) => arr.length
 * ) // Logs: "Before filter: [1, 2, 3]", "After filter: [2, 3]", Returns: 2
 * ```
 */
export function tap<T>(fn: (value: T) => void): UnaryFunction<T, T> {
  return (value: T): T => {
    fn(value)
    return value
  }
}

// ============================================================================
// UTILITY TYPE EXPORTS
// ============================================================================

// Types are already exported above, no need to re-export
