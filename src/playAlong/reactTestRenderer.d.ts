// react-test-renderer ships with jest-expo but without types (there is no
// @types package for React 19). The tests use only this much of it.
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export type ReactTestInstance = {
    type: unknown;
    props: Record<string, any>;
    children: (ReactTestInstance | string)[];
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
  };

  export type ReactTestRenderer = {
    root: ReactTestInstance;
    toJSON(): unknown;
    unmount(): void;
  };

  export function create(element: ReactElement): ReactTestRenderer;
}
