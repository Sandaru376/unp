import React, { useEffect, useRef, useState } from "react";

export default function CountUp({ value, duration = 1100 }) {
  const [display, setDisplay] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    const begin = last.current;
    const start = performance.now();
    let raf;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(begin + (value - begin) * eased);
      last.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}
