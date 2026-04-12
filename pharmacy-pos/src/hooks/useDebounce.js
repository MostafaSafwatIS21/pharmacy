import { useEffect, useState } from "react";

export const useDebounce = (value, delay = 350) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
};
