import React from 'react';

type AvatarProps = {
  level: number;
  xp: number;
};

const getArmor = (level: number) => {
  if (level >= 16) return { stage: 'Легенда', className: 'avatar-legend' };
  if (level >= 6) return { stage: 'Воин', className: 'avatar-warrior' };
  return { stage: 'Новичок', className: 'avatar-novice' };
};

export function Avatar({ level, xp }: AvatarProps) {
  const armor = getArmor(level);

  return (
    <section className="panel">
      <h3>Рыцарь прогресса</h3>
      <div className={`avatar ${armor.className}`}>
        <span>🛡️</span>
      </div>
      <p className="lvl">Lvl {level}</p>
      <p className="muted">{armor.stage}</p>
      <p className="muted">XP: {xp}</p>
    </section>
  );
}
