import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Small data hook: { data, error, loading, reload }. Re-runs when `key` changes. */
export function useFetch(path, options, key = path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(() => {
    if (!path) return undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    api(path, options)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => load(), [load]);
  return { ...state, reload: load };
}
