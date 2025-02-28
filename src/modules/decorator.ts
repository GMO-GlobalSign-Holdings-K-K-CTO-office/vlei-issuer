/**
 * A decorator that logs the method name and arguments when called.
 * Use this as an annotation for methods.
 *
 * @param value
 * @param context
 * @returns
 */
export function LogMethod<T extends (...args: any[]) => any>(
  value: T,
  context: ClassMethodDecoratorContext,
) {
  return async function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> {
    console.log(`Calling ${String(context.name)} with arguments:`, args);
    const result = await value.apply(this, args);
    console.log(`Result from ${String(context.name)}:`, result);
    return result;
  };
}

/**
 * A decorator that logs the method name and arguments when called.
 * Use this as an annotation for a class.
 *
 * @param vddalue
 */
export function LogAllMethods(value: Function) {
  // iterate over all methods in the class

  for (const key of Object.getOwnPropertyNames(value.prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(value.prototype, key);
    if (
      descriptor &&
      typeof descriptor.value === "function" &&
      key !== "constructor"
    ) {
      const originalMethod = descriptor.value;

      const methodDecoratorContext: ClassMethodDecoratorContext = {
        kind: "method",
        name: key,
        access: {
          has(this: any) {
            return key in this;
          },
          get(this: any) {
            return this[key];
          },
        },
        static: false,
        private: false,
        addInitializer: () => {},
        metadata: {},
      };

      // decorate the method
      const decoratedMethod = LogMethod(originalMethod, methodDecoratorContext);

      // override the original method
      Object.defineProperty(value.prototype, key, {
        ...descriptor,
        value: decoratedMethod,
      });
    }
  }
}
