function asyncCache(_this_, func) {
  const cacheMap = new Map();

  return async function (...args) {
    const key = args.length == 1 ? args[0] : JSON.stringify(args);
    if (cacheMap.has(key)) return cacheMap.get(key);
    const result = await func.apply(_this_, args);
    cacheMap.set(key, result);
    return result;
  };
}
function cache(_this_, func) {
  const cacheMap = new Map();

  return function (...args) {
    const key = args.length == 1 ? args[0] : JSON.stringify(args);
    if (cacheMap.has(key)) return cacheMap.get(key);
    const result = func.apply(_this_, args);
    cacheMap.set(key, result);
    return result;
  };
}
