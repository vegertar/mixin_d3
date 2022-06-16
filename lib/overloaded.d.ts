// see https://github.com/microsoft/TypeScript/issues/32164

type Overloads<T extends (...args: any[]) => any> = T extends {
  (...args: infer A1): infer R1;
  (...args: infer A2): infer R2;
  (...args: infer A3): infer R3;
  (...args: infer A4): infer R4;
  (...args: infer A5): infer R5;
  (...args: infer A6): infer R6;
}
  ? [[A1, A2, A3, A4, A5, A6], [R1, R2, R3, R4, R5, R6]]
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
      (...args: infer A4): infer R4;
      (...args: infer A5): infer R5;
    }
  ? [[A1, A2, A3, A4, A5], [R1, R2, R3, R4, R5]]
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
      (...args: infer A4): infer R4;
    }
  ? [[A1, A2, A3, A4], [R1, R2, R3, R4]]
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
    }
  ? [[A1, A2, A3], [R1, R2, R3]]
  : T extends { (...args: infer A1): infer R1; (...args: infer A2): infer R2 }
  ? [[A1, A2], [R1, R2]]
  : T extends { (...args: infer A1): infer R1 }
  ? [[A1], [R1]]
  : never;

type filterUnknowns<T> = T extends [infer A, ...infer Rest]
  ? unknown[] extends A
    ? filterUnknowns<Rest>
    : [A, ...filterUnknowns<Rest>]
  : T;

// convert [[], [string], [string, number]]> to [] | [string] | [string, number]
type TupleArrayUnion<A extends readonly unknown[][]> = A extends (infer T)[]
  ? T extends unknown[]
    ? T
    : []
  : [];

export type OverloadedParameters<T extends (...args: any[]) => any> =
  TupleArrayUnion<filterUnknowns<Overloads<T>[0]>>;
