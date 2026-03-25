import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Avatar } from './components/Avatar';
import { FocusMode } from './components/FocusMode';
import { TaskList, type Task, type TaskStatus } from './components/TaskList';
import { ApiClient, type Stats } from './lib/api';

const defaultStats: Stats = { userId: 0, xp: 0, level: 1, armorStage: 'novice' };

export function App() {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('kta_base_url') || 'https://your-ngrok-url.ngrok-free.app');
  const [apiKey, setApiKey] = useState(localStorage.getItem('kta_api_key') || '');
  const [connected, setConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [activeTask, setActiveTask] = useState<Task | undefined>();
  const [message, setMessage] = useState('Подключитесь к API, чтобы начать.');
  const [newTask, setNewTask] = useState({ title: '', description: '', difficulty: 'easy' as const });
  const prevLevelRef = useRef(1);

  const api = useMemo(() => new ApiClient(baseUrl, apiKey), [baseUrl, apiKey]);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  useEffect(() => {
    if (stats.level > prevLevelRef.current) {
      setMessage(`🎉 Level Up! Теперь вы уровень ${stats.level}`);
      prevLevelRef.current = stats.level;
    }
  }, [stats.level]);

  const reload = useCallback(async () => {
    const [taskItems, stat] = await Promise.all([api.getTasks(), api.getStats()]);
    setTasks(taskItems);
    setStats(stat);
    if (taskItems.length && !activeTask) setActiveTask(taskItems[0]);
  }, [api, activeTask]);

  const connect = async () => {
    try {
      localStorage.setItem('kta_base_url', baseUrl);
      localStorage.setItem('kta_api_key', apiKey);
      await reload();
      setConnected(true);
      setMessage('Подключено к Knight API ✅');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка подключения');
      setConnected(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await api.createTask(newTask);
      setNewTask({ title: '', description: '', difficulty: 'easy' });
      await reload();
      setMessage('Задача создана.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка создания задачи');
    }
  };

  const updateTaskStatus = async (taskId: number, status: TaskStatus) => {
    try {
      const result = await api.updateTaskStatus(taskId, status);
      setStats(result.stats);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
      setMessage('Статус задачи обновлён.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка обновления статуса');
    }
  };

  const completeFocus = async () => {
    try {
      const result = await api.completeFocusSession(15);
      setStats(result.stats);
      setMessage(`Фокус-сессия завершена: +${result.bonusXp} XP`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка начисления бонуса');
    }
  };

  return (
    <main className="app-root">
      <header className="panel">
        <h1>Knight Task Tracker</h1>
        <p className="muted">Telegram user: {WebApp.initDataUnsafe?.user?.username || 'guest'}</p>
      </header>

      <section className="panel config">
        <h3>Подключение к API</h3>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-ngrok-url.ngrok-free.app" />
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="kta_xxx" />
        <button onClick={connect}>Подключиться</button>
        <small className="muted">Для Telegram Mini App нужен публичный HTTPS URL (ngrok/Cloudflare Tunnel).</small>
      </section>

      <p className="status-line">{message}</p>

      {connected ? (
        <>
          <div className="grid">
            <Avatar level={stats.level} xp={stats.xp} />

            <section className="panel">
              <h3>Новый квест</h3>
              <input
                value={newTask.title}
                onChange={(e) => setNewTask((s) => ({ ...s, title: e.target.value }))}
                placeholder="Название задачи"
              />
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask((s) => ({ ...s, description: e.target.value }))}
                placeholder="Описание"
              />
              <select
                value={newTask.difficulty}
                onChange={(e) => setNewTask((s) => ({ ...s, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
              >
                <option value="easy">Easy (10 XP)</option>
                <option value="medium">Medium (25 XP)</option>
                <option value="hard">Hard (50 XP)</option>
              </select>
              <button onClick={createTask}>Создать задачу</button>
            </section>
          </div>

          <section className="panel">
            <FocusMode activeTask={activeTask} onComplete={completeFocus} />
          </section>

          <TaskList tasks={tasks} onStatusChange={updateTaskStatus} onSelectActiveTask={setActiveTask} />
        </>
      ) : null}
    </main>
  );
}
