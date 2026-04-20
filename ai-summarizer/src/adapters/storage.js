let _get, _set;

export function init(impl) {
  _get = impl.get;
  _set = impl.set;
}

export async function get(key, defaultVal) {
  return await _get(key, defaultVal);
}

export async function set(key, val) {
  return await _set(key, val);
}
