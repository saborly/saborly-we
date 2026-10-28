/**
 * dart2js String.hashCode (Flutter Web), used by FoodCategoryCard / MobileCategoriesSection to pick a
 * colour scheme from the category name: `name.hashCode.abs() % schemes.length`.
 * Source: sdk/lib/_internal/js_runtime/lib/js_string.dart  (JSString.hashCode)
 */
export function dartStringHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = 0x1fffffff & (hash + s.charCodeAt(i));
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    hash ^= hash >> 6;
  }
  hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
  hash ^= hash >> 11;
  return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
}
export const hashIndex = (s: string, n: number) => Math.abs(dartStringHash(s)) % n;
