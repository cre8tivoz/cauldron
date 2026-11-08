type Task<T> = () => Promise<T> | T;
declare function createSerialQueue(): <T>(task: Task<T>) => Promise<T>;
declare function createKeyedQueue<T>(): {
    run(key: string, task: (assertActive: () => void) => Promise<T> | T): Promise<T>;
    cancel(): void;
};
export { createSerialQueue, createKeyedQueue };
