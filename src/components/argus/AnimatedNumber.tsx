import { useEffect, useState } from "react";
import { animate } from "framer-motion";

export function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration: 1.4, ease: "easeOut", onUpdate: (v) => setN(v) });
    return () => c.stop();
  }, [value]);
  return <span>{n.toFixed(decimals)}{suffix}</span>;
}
