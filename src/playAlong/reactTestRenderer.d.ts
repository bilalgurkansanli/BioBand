// react-test-renderer ships with jest-expo but without types (there is no
// @types package for React 19). The hook tests use only this much of it.
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export type ReactTestRenderer = {
    unmount(): void;
  };

  export function create(element: ReactElement): ReactTestRenderer;
}
