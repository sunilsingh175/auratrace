export function applyHotpatch(target: any, methodName: string, replacement: Function) {
  if (target && typeof target[methodName] === "function") {
    target[methodName] = replacement;
    return true;
  }
  return false;
}
