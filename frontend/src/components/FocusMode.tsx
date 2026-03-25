import React, { useEffect, useMemo, useState } from 'react';
import type { Task } from './TaskList';

type FocusModeProps = {
  activeTask?: Task;
  onComplete: () => void;
};

const DEFAULT_SECONDS = 25 * 60;

export function FocusMode({ activeTask, onComplete }: FocusModeProps) {
  const [enabled, setEnabled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SECONDS);

  useEffect(() => {
    if (!enabled) return;
    if (secondsLeft <= 0) {
      onComplete();
      setEnabled(false);
      setSecondsLeft(DEFAULT_SECONDS);
      return;
    }

    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [enabled, secondsLeft, onComplete]);

  const timerLabel = useMemo(() => {
    const min = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const sec = (secondsLeft % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }, [secondsLeft]);

  if (enabled) {
    return (
      <section className="focus-overlay">
        <p>Режим фокуса активен</p>
        <h1>{timerLabel}</h1>
        <p>{activeTask ? `Задача: ${activeTask.title}` : 'Выберите активную задачу'}</p>
        <button onClick={() => setEnabled(false)}>Выйти</button>
      </section>
    );
  }

  return <button onClick={() => setEnabled(true)}>В фокусе</button>;
}
