import { useDebounceEffect } from "@/utils/useDebounceEffect";
import { useEffect, useRef, useState } from "react";

/**
 * A custom hook that provides debounced input handling to prevent jumpy text inputs
 * when saving changes directly to backend on every keystroke.
 *
 * @param initialValue - The initial value for the input
 * @param onChange - Callback function to save the value (e.g., to backend)
 * @param debounceMs - Debounce delay in milliseconds (default: 500ms)
 * @returns A tuple of [currentValue, setValue] similar to useState
 */
export function useDebouncedInput<T>(
  initialValue: T,
  onChange: (value: T) => void,
  debounceMs = 100,
): [T, (value: T) => void] {
  // Local state to prevent jumpy input
  const [localValue, setLocalValue] = useState(initialValue);
  
  // Track synchronization state
  const prevInitialValueRef = useRef<T>(initialValue);
  const isDirtyRef = useRef(false);

  // Sync local state when initialValue changes externally
  useEffect(() => {
    if (initialValue !== prevInitialValueRef.current) {
      prevInitialValueRef.current = initialValue;
      
      // Echo Suppression Logic:
      // Only set local value if we aren't currently editing (dirty)
      // or if the incoming value has caught up to our local value.
      if (!isDirtyRef.current || initialValue === localValue) {
        setLocalValue(initialValue);
        isDirtyRef.current = false;
      }
    }
  }, [initialValue, localValue]);

  // Wrapped setter to track dirty state
  const setValue = (newValue: T) => {
    isDirtyRef.current = true;
    setLocalValue(newValue);
  };

  // Debounced backend save
  useDebounceEffect(
    () => {
      if (isDirtyRef.current) {
        onChange(localValue);
        // We stay dirty until the backend echoes this value back to us
      }
    },
    debounceMs,
    [localValue],
  );

  return [localValue, setValue];
}
