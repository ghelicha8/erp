import { useState, useEffect, useCallback } from 'react';

export interface UndoEntry {
  id: string;
  items: string[];
  expireAt: number;
}

// هوک مشترک حذف موقت با امکان انصراف (مثل سایر بخش‌های برنامه)
export function useUndoDelete(doDelete: (id: string) => void, timeoutMs = 5000) {
  const [undoItems, setUndoItems] = useState<UndoEntry[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => {
        const expired = prev.filter(u => u.expireAt <= now);
        const active = prev.filter(u => u.expireAt > now);
        if (expired.length > 0) {
          expired.forEach(u => u.items.forEach(id => doDelete(id)));
          setTimeout(() => setPendingDeleteIds(curr => curr.filter(id => !expired.flatMap(e => e.items).includes(id))), 0);
        }
        return active;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [doDelete]);

  const triggerDelete = useCallback((ids: string[]) => {
    const undoId = Date.now().toString();
    setUndoItems(prev => [...prev, { id: undoId, items: ids, expireAt: Date.now() + timeoutMs }]);
    setPendingDeleteIds(prev => [...prev, ...ids]);
  }, [timeoutMs]);

  const cancelUndo = useCallback((undoId: string) => {
    const entry = undoItems.find(u => u.id === undoId);
    if (entry) setPendingDeleteIds(prev => prev.filter(id => !entry.items.includes(id)));
    setUndoItems(prev => prev.filter(u => u.id !== undoId));
  }, [undoItems]);

  return { undoItems, pendingDeleteIds, triggerDelete, cancelUndo };
}
