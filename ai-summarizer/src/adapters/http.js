let _stream, _fetchJson;

export function init(impl) {
  _stream = impl.stream;
  _fetchJson = impl.fetchJson;
}

export function stream(url, headers, body, callbacks) {
  return _stream(url, headers, body, callbacks);
}

export async function fetchJson(url, headers) {
  return await _fetchJson(url, headers);
}
