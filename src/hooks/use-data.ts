import { useState, useEffect, DependencyList } from "react";

/**
 * Fetches a list on mount and returns [items, setItems].
 * Pass a stable deps array if you need the fetch to re-run.
 */
export function useList<T>(
  fetcher: () => Promise<T[]>,
  deps: DependencyList = []
): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active && import.meta.env.DEV) console.error(err);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [items, setItems];
}
