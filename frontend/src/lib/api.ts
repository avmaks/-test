import type { Task, TaskStatus } from '../components/TaskList';

export type Stats = {
  userId: number;
  xp: number;
  level: number;
  armorStage: 'novice' | 'warrior' | 'legend';
};

const jsonHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'x-api-key': apiKey
});

export class ApiClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async getTasks(): Promise<Task[]> {
    const res = await fetch(`${this.baseUrl}/api/tasks`, { headers: jsonHeaders(this.apiKey) });
    if (!res.ok) throw new Error('Не удалось получить задачи');
    return res.json();
  }

  async createTask(payload: { title: string; description?: string; difficulty: 'easy' | 'medium' | 'hard' }) {
    const res = await fetch(`${this.baseUrl}/api/tasks`, {
      method: 'POST',
      headers: jsonHeaders(this.apiKey),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Не удалось создать задачу');
    return res.json() as Promise<Task>;
  }

  async updateTaskStatus(taskId: number, status: TaskStatus) {
    const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: jsonHeaders(this.apiKey),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Не удалось обновить статус задачи');
    return res.json() as Promise<{ task: Task; stats: Stats }>;
  }

  async getStats(): Promise<Stats> {
    const res = await fetch(`${this.baseUrl}/api/stats`, { headers: jsonHeaders(this.apiKey) });
    if (!res.ok) throw new Error('Не удалось получить статистику');
    return res.json();
  }

  async completeFocusSession(bonusXp = 15) {
    const res = await fetch(`${this.baseUrl}/api/focus/complete`, {
      method: 'POST',
      headers: jsonHeaders(this.apiKey),
      body: JSON.stringify({ bonusXp })
    });
    if (!res.ok) throw new Error('Не удалось начислить бонус за фокус');
    return res.json() as Promise<{ bonusXp: number; stats: Stats }>;
  }
}
