import { useEffect, useRef, useState } from 'react';
import { differenceInSeconds } from 'date-fns';

export default function CountdownTimer({ createdAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, 600 - differenceInSeconds(new Date(), new Date(createdAt))));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, 600 - differenceInSeconds(new Date(), new Date(createdAt))));
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [createdAt]);
  useEffect(() => { if (remaining === 0) onExpireRef.current?.(); }, [remaining]);
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  return <span className={`countdown ${remaining < 120 ? 'countdown-warning' : ''} ${remaining < 30 ? 'countdown-critical' : ''}`} aria-live="polite">{minutes}:{seconds}</span>;
}
