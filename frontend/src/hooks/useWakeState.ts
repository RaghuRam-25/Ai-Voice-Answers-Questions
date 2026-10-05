import { useEffect, useState } from 'react';

export const useWakeState = (onWakeTrigger: () => void) => {
  const [isTriggered, setIsTriggered] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && event.ctrlKey) {
        event.preventDefault();
        setIsTriggered(true);
        onWakeTrigger();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onWakeTrigger]);

  return { isTriggered, resetTrigger: () => setIsTriggered(false) };
};