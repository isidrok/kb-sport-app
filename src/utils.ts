/**
 * Deep merges two objects, with the second object taking precedence
 * @param target The target object to merge into
 * @param source The source object to merge from
 * @returns A new object with the merged values
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(
        target[key] as object,
        source[key] as object
      ) as T[Extract<keyof T, string>];
    } else {
      output[key] = source[key] as T[Extract<keyof T, string>];
    }
  }

  return output;
}
