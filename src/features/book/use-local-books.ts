"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteBook, duplicateBook, listBooks, type BookMeta } from "./storage";

/** The photo books kept in this browser. */
export function useLocalBooks() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const reload = useCallback(async () => {
    try {
      setBooks(await listBooks());
    } catch {
      setUnavailable(true);
      setBooks([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listBooks()
      .then((list) => {
        if (!cancelled) setBooks(list);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteBook(id);
    setBooks((list) => list.filter((b) => b.id !== id));
  }, []);

  const duplicate = useCallback(
    async (id: string) => {
      await duplicateBook(id);
      await reload();
    },
    [reload],
  );

  return { books, loaded, unavailable, remove, duplicate };
}
