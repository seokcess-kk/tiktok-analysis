'use client';

import { useEffect, useCallback } from 'react';

type KeyboardShortcutCallback = () => void;

interface UseKeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  enabled?: boolean;
}

export function useKeyboardShortcut(
  options: UseKeyboardShortcutOptions,
  callback: KeyboardShortcutCallback
) {
  const {
    key,
    ctrlKey = false,
    metaKey = false,
    shiftKey = false,
    altKey = false,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isCtrlOrMeta = ctrlKey || metaKey;
      const hasCorrectModifier = isCtrlOrMeta
        ? event.ctrlKey || event.metaKey
        : true;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        hasCorrectModifier &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey
      ) {
        event.preventDefault();
        callback();
      }
    },
    [key, ctrlKey, metaKey, shiftKey, altKey, enabled, callback]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

// Convenience hook for Cmd+K / Ctrl+K
export function useCommandK(callback: KeyboardShortcutCallback, enabled = true) {
  useKeyboardShortcut(
    { key: 'k', ctrlKey: true, metaKey: true, enabled },
    callback
  );
}
