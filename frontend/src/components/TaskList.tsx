import React from 'react';

export type TaskStatus = 'new' | 'in_progress' | 'done';
export type Task = {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
};

type TaskListProps = {
  tasks: Task[];
  onStatusChange: (taskId: number, status: TaskStatus) => void;
  onSelectActiveTask: (task: Task) => void;
};

const statusLabel: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В процессе',
  done: 'Выполнено'
};

export function TaskList({ tasks, onStatusChange, onSelectActiveTask }: TaskListProps) {
  return (
    <section className="panel">
      <h3>Квесты</h3>
      <div className="task-list">
        {tasks.map((task) => (
          <article key={task.id} className="task-card">
            <div className="task-head">
              <strong>{task.title}</strong>
              <span>+{task.xp_reward} XP</span>
            </div>
            {task.description ? <p className="muted">{task.description}</p> : null}
            <div className="task-actions">
              <small>Статус: {statusLabel[task.status]}</small>
              <select value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}>
                <option value="new">Новая</option>
                <option value="in_progress">В процессе</option>
                <option value="done">Выполнено</option>
              </select>
              <button onClick={() => onSelectActiveTask(task)}>Сделать активной</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
