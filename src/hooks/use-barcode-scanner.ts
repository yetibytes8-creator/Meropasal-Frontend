import { useEffect, useRef, useCallback } from "react";

/**
 * Hook that detects barcode scanner input.
 * Barcode scanners type characters very rapidly (< 50ms between keys)
 * and typically end with Enter. This hook distinguishes scanner input
 * from normal typing by measuring keystroke speed.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_KEY_INTERVAL = 50; // ms — scanners type faster than this
  const MIN_BARCODE_LENGTH = 3; // minimum chars to count as a barcode

  const processBuffer = useCallback(() => {
    const code = bufferRef.current.trim();
    if (code.length >= MIN_BARCODE_LENGTH) {
      onScan(code);
    }
    bufferRef.current = "";
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is focused on an input/textarea (except the search field)
      const target = e.target as HTMLElement;
      const isSearchField = target.getAttribute("data-barcode-target") === "true";
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInput && !isSearchField) return;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      if (e.key === "Enter") {
        e.preventDefault();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        processBuffer();
        lastKeyTimeRef.current = 0;
        return;
      }

      // Only single printable characters
      if (e.key.length !== 1) return;

      // If too slow, reset buffer (normal typing)
      if (timeSinceLastKey > MAX_KEY_INTERVAL && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      bufferRef.current += e.key;
      lastKeyTimeRef.current = now;

      // Auto-process after a pause (in case scanner doesn't send Enter)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          processBuffer();
        } else {
          bufferRef.current = "";
        }
      }, 100);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [processBuffer]);
}
