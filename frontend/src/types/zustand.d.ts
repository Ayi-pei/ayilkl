declare module 'zustand' {
  declare function create<T>(
    initializer: (
      set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
      get: () => T
    ) => T
  ): () => T;
  export default create;
}