import { useEffect, useState } from "react";

export const usePollTimer = (remainingMs: number) => {
  const [time, setTime] = useState(Math.floor(remainingMs / 1000));

  useEffect(() => {
    const i = setInterval(() => {
      setTime(t => Math.max(t - 1, 0));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  return time;
};
