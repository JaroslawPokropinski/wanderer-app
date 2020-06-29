declare module 'qheap' {
  export default class Heap<T> {
    insert(e: T): void;
    remove(): T | undefined;
    peek(): T | undefined;
    constructor(options?: { comparBefore?: (a: T, b: T) => boolean });
  }
}
