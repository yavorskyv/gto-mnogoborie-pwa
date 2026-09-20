/**
 * GTO Norms and Score Calculator
 */
import { GTO_NORMS } from './data.js';

export function calculateNormScore(normId, userVal) {
  const norm = GTO_NORMS.find(n => n.id === normId);
  if (!norm || isNaN(userVal) || userVal <= 0) {
    return { points: 0, badge: 'none', label: 'Нет данных' };
  }

  let badge = 'none';
  let points = 0;

  if (norm.isReverse) {
    // Lower is better (running, swimming)
    if (userVal <= norm.gold) {
      badge = 'gold';
      points = Math.round(100 + (norm.gold - userVal) * norm.multiplier);
    } else if (userVal <= norm.silver) {
      badge = 'silver';
      points = Math.round(75 + (norm.silver - userVal) * (25 / (norm.silver - norm.gold)));
    } else if (userVal <= norm.bronze) {
      badge = 'bronze';
      points = Math.round(50 + (norm.bronze - userVal) * (25 / (norm.bronze - norm.silver)));
    } else {
      points = Math.max(10, Math.round(50 - (userVal - norm.bronze) * norm.multiplier));
    }
  } else {
    // Higher is better (reps, kg)
    if (userVal >= norm.gold) {
      badge = 'gold';
      points = Math.round(100 + (userVal - norm.gold) * norm.multiplier);
    } else if (userVal >= norm.silver) {
      badge = 'silver';
      points = Math.round(75 + ((userVal - norm.silver) / (norm.gold - norm.silver)) * 25);
    } else if (userVal >= norm.bronze) {
      badge = 'bronze';
      points = Math.round(50 + ((userVal - norm.bronze) / (norm.silver - norm.bronze)) * 25);
    } else {
      points = Math.max(10, Math.round((userVal / norm.bronze) * 50));
    }
  }

  const badgeLabels = {
    gold: 'Золотой знак',
    silver: 'Серебряный знак',
    bronze: 'Бронзовый знак',
    none: 'Ниже норматива'
  };

  return {
    points: Math.min(150, Math.max(0, points)),
    badge,
    label: badgeLabels[badge]
  };
}

export function evaluateTotalGto(values) {
  let totalPoints = 0;
  let goldCount = 0;
  let silverCount = 0;
  let bronzeCount = 0;
  const details = {};

  GTO_NORMS.forEach(norm => {
    const val = parseFloat(values[norm.id] || 0);
    const result = calculateNormScore(norm.id, val);
    details[norm.id] = result;
    totalPoints += result.points;

    if (result.badge === 'gold') goldCount++;
    else if (result.badge === 'silver') silverCount++;
    else if (result.badge === 'bronze') bronzeCount++;
  });

  let overallBadge = 'none';
  let overallTitle = 'Кандидат в сборную';

  if (goldCount >= 4 && (silverCount + goldCount === 5)) {
    overallBadge = 'gold';
    overallTitle = '🥇 Золотой знак отличия ГТО (Элита соревнований)';
  } else if ((goldCount + silverCount) >= 4 && (goldCount + silverCount + bronzeCount === 5)) {
    overallBadge = 'silver';
    overallTitle = '🥈 Серебряный знак отличия ГТО (Высокий уровень)';
  } else if ((goldCount + silverCount + bronzeCount) >= 4) {
    overallBadge = 'bronze';
    overallTitle = '🥉 Бронзовый знак отличия ГТО (Базовый норматив)';
  } else {
    overallBadge = 'none';
    overallTitle = 'Требуется подтянуть дисциплины для знака';
  }

  return {
    totalPoints,
    overallBadge,
    overallTitle,
    details
  };
}
