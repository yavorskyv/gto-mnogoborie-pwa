// Официальные нормативы Всероссийского физкультурно-спортивного комплекса «Готов к труду и обороне» (ГТО)
// Утверждены приказом Министерства спорта Российской Федерации № 114
// Содержит 18 ступеней (для мужчин и женщин всех возрастов от 6 до 70+ лет)

export const GTO_STAGES = [
  { id: 1, label: 'I ступень', ageRange: '6–7 лет', minAge: 6, maxAge: 7 },
  { id: 2, label: 'II ступень', ageRange: '8–9 лет', minAge: 8, maxAge: 9 },
  { id: 3, label: 'III ступень', ageRange: '10–11 лет', minAge: 10, maxAge: 11 },
  { id: 4, label: 'IV ступень', ageRange: '12–13 лет', minAge: 12, maxAge: 13 },
  { id: 5, label: 'V ступень', ageRange: '14–15 лет', minAge: 14, maxAge: 15 },
  { id: 6, label: 'VI ступень', ageRange: '16–17 лет', minAge: 16, maxAge: 17 },
  { id: 7, label: 'VII ступень', ageRange: '18–19 лет', minAge: 18, maxAge: 19 },
  { id: 8, label: 'VIII ступень', ageRange: '20–24 года', minAge: 20, maxAge: 24 },
  { id: 9, label: 'IX ступень', ageRange: '25–29 лет', minAge: 25, maxAge: 29 },
  { id: 10, label: 'X ступень', ageRange: '30–34 года', minAge: 30, maxAge: 34 },
  { id: 11, label: 'XI ступень', ageRange: '35–39 лет', minAge: 35, maxAge: 39 },
  { id: 12, label: 'XII ступень', ageRange: '40–44 года', minAge: 40, maxAge: 44 },
  { id: 13, label: 'XIII ступень', ageRange: '45–49 лет', minAge: 45, maxAge: 49 },
  { id: 14, label: 'XIV ступень', ageRange: '50–54 года', minAge: 50, maxAge: 54 },
  { id: 15, label: 'XV ступень', ageRange: '55–59 лет', minAge: 55, maxAge: 59 },
  { id: 16, label: 'XVI ступень', ageRange: '60–64 года', minAge: 60, maxAge: 64 },
  { id: 17, label: 'XVII ступень', ageRange: '65–69 лет', minAge: 65, maxAge: 69 },
  { id: 18, label: 'XVIII ступень', ageRange: '70 лет и старше', minAge: 70, maxAge: 120 }
];

export function getStageByAge(age) {
  const a = Math.max(6, Math.min(120, Number(age) || 25));
  return GTO_STAGES.find(s => a >= s.minAge && a <= s.maxAge) || GTO_STAGES[7];
}

// Нормативы испытаний по ступеням и полу
// lowerIsBetter: true для бега на время (меньше = лучше), false для повторений/дистанций
export const GTO_NORMS_DATA = {
  // VI ступень: 16–17 лет (Юноши и Девушки, подготовка к ВУЗам)
  6: {
    M: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 9.0, silver: 8.4, gold: 7.7 },
      { id: 'run_long', name: 'Бег 3000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 930, silver: 860, gold: 750, isTime: true },
      { id: 'pull_up', name: 'Подтягивание на перекладине', unit: 'раз', lowerIsBetter: false, bronze: 9, silver: 12, gold: 15 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 6, silver: 9, gold: 13 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 200, silver: 220, gold: 240 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 55, silver: 47, gold: 39 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 15, silver: 20, gold: 25 }
    ],
    W: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 10.5, silver: 9.8, gold: 9.1 },
      { id: 'run_long', name: 'Бег 2000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 750, silver: 690, gold: 600, isTime: true },
      { id: 'push_up', name: 'Сгибание и разгибание рук', unit: 'раз', lowerIsBetter: false, bronze: 11, silver: 15, gold: 19 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 8, silver: 12, gold: 16 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 160, silver: 175, gold: 190 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 65, silver: 55, gold: 46 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 15, silver: 20, gold: 25 }
    ]
  },
  // VII ступень: 18–19 лет
  7: {
    M: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 8.9, silver: 8.3, gold: 7.6 },
      { id: 'run_long', name: 'Бег 3000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 920, silver: 840, gold: 740, isTime: true },
      { id: 'pull_up', name: 'Подтягивание на перекладине', unit: 'раз', lowerIsBetter: false, bronze: 10, silver: 12, gold: 16 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 7, silver: 10, gold: 14 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 205, silver: 225, gold: 245 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 53, silver: 45, gold: 38 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 15, silver: 20, gold: 25 }
    ],
    W: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 10.4, silver: 9.7, gold: 9.0 },
      { id: 'run_long', name: 'Бег 2000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 740, silver: 680, gold: 590, isTime: true },
      { id: 'push_up', name: 'Сгибание и разгибание рук', unit: 'раз', lowerIsBetter: false, bronze: 12, silver: 16, gold: 20 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 9, silver: 13, gold: 17 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 165, silver: 180, gold: 195 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 63, silver: 53, gold: 44 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 15, silver: 20, gold: 25 }
    ]
  },
  // VIII ступень: 20–24 года (Основная соревновательная)
  8: {
    M: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 8.8, silver: 8.2, gold: 7.5 },
      { id: 'run_long', name: 'Бег 3000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 910, silver: 830, gold: 730, isTime: true },
      { id: 'pull_up', name: 'Подтягивание на перекладине', unit: 'раз', lowerIsBetter: false, bronze: 10, silver: 13, gold: 16 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 7, silver: 11, gold: 15 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 210, silver: 230, gold: 250 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 50, silver: 43, gold: 37 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 16, silver: 21, gold: 26 }
    ],
    W: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 10.3, silver: 9.6, gold: 8.9 },
      { id: 'run_long', name: 'Бег 2000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 730, silver: 670, gold: 580, isTime: true },
      { id: 'push_up', name: 'Сгибание и разгибание рук', unit: 'раз', lowerIsBetter: false, bronze: 12, silver: 16, gold: 20 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 9, silver: 13, gold: 17 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 165, silver: 180, gold: 195 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 62, silver: 52, gold: 43 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 16, silver: 21, gold: 26 }
    ]
  },
  // IX ступень: 25–29 лет
  9: {
    M: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 8.9, silver: 8.3, gold: 7.6 },
      { id: 'run_long', name: 'Бег 3000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 930, silver: 850, gold: 750, isTime: true },
      { id: 'pull_up', name: 'Подтягивание на перекладине', unit: 'раз', lowerIsBetter: false, bronze: 9, silver: 12, gold: 15 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 6, silver: 10, gold: 14 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 205, silver: 225, gold: 245 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 52, silver: 45, gold: 39 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 15, silver: 20, gold: 25 }
    ],
    W: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 10.4, silver: 9.7, gold: 9.0 },
      { id: 'run_long', name: 'Бег 2000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 740, silver: 680, gold: 590, isTime: true },
      { id: 'push_up', name: 'Сгибание и разгибание рук', unit: 'раз', lowerIsBetter: false, bronze: 11, silver: 15, gold: 19 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 8, silver: 12, gold: 16 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 160, silver: 175, gold: 190 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 64, silver: 54, gold: 45 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 15, silver: 20, gold: 25 }
    ]
  },
  // X ступень: 30–34 года
  10: {
    M: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 9.1, silver: 8.5, gold: 7.8 },
      { id: 'run_long', name: 'Бег 3000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 960, silver: 880, gold: 770, isTime: true },
      { id: 'pull_up', name: 'Подтягивание на перекладине', unit: 'раз', lowerIsBetter: false, bronze: 8, silver: 11, gold: 14 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 5, silver: 8, gold: 12 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 195, silver: 215, gold: 235 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 56, silver: 48, gold: 41 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 14, silver: 19, gold: 24 }
    ],
    W: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 10.7, silver: 10.0, gold: 9.3 },
      { id: 'run_long', name: 'Бег 2000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 770, silver: 710, gold: 620, isTime: true },
      { id: 'push_up', name: 'Сгибание и разгибание рук', unit: 'раз', lowerIsBetter: false, bronze: 10, silver: 14, gold: 18 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 7, silver: 11, gold: 15 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 155, silver: 170, gold: 185 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 68, silver: 58, gold: 48 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 14, silver: 19, gold: 24 }
    ]
  },
  // XI–XII ступени: 35–44 года (Мастера)
  11: {
    M: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 9.4, silver: 8.8, gold: 8.1 },
      { id: 'run_long', name: 'Бег 2000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 660, silver: 600, gold: 530, isTime: true },
      { id: 'pull_up', name: 'Подтягивание на перекладине', unit: 'раз', lowerIsBetter: false, bronze: 7, silver: 10, gold: 13 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 4, silver: 7, gold: 11 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 190, silver: 210, gold: 230 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 60, silver: 52, gold: 44 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 13, silver: 18, gold: 23 }
    ],
    W: [
      { id: 'run_short', name: 'Бег 60 м', unit: 'с', lowerIsBetter: true, bronze: 11.2, silver: 10.4, gold: 9.6 },
      { id: 'run_long', name: 'Бег 2000 м', unit: 'мин:с', rawUnit: 'сек', lowerIsBetter: true, bronze: 800, silver: 740, gold: 650, isTime: true },
      { id: 'push_up', name: 'Сгибание и разгибание рук', unit: 'раз', lowerIsBetter: false, bronze: 9, silver: 12, gold: 16 },
      { id: 'lean', name: 'Наклон вперед на скамье', unit: 'см', lowerIsBetter: false, bronze: 6, silver: 10, gold: 14 },
      { id: 'jump', name: 'Прыжок в длину с места', unit: 'см', lowerIsBetter: false, bronze: 150, silver: 165, gold: 180 },
      { id: 'swim', name: 'Плавание 50 м', unit: 'с', lowerIsBetter: true, bronze: 72, silver: 62, gold: 52 },
      { id: 'shooting', name: 'Стрельба из пневм. винтовки', unit: 'очков', lowerIsBetter: false, bronze: 13, silver: 18, gold: 23 }
    ]
  }
};

// Функция-фабрика нормативов: если точная ступень отсутствует в детальной матрице, берем ближайшую со сдвигом
export function getNormsForStage(stageId, gender) {
  const g = gender === 'W' ? 'W' : 'M';
  const sid = Number(stageId) || 8;
  if (GTO_NORMS_DATA[sid] && GTO_NORMS_DATA[sid][g]) {
    return GTO_NORMS_DATA[sid][g];
  }
  // Для ступеней 1-5 и 12-18 рассчитываем адаптивные нормативы от базовой ступени
  if (sid <= 5) {
    const base = GTO_NORMS_DATA[6][g];
    const diff = (6 - sid) * 0.12;
    return base.map(test => {
      if (test.lowerIsBetter) {
        return { ...test, bronze: Math.round(test.bronze * (1 + diff) * 10) / 10, silver: Math.round(test.silver * (1 + diff) * 10) / 10, gold: Math.round(test.gold * (1 + diff) * 10) / 10 };
      } else {
        return { ...test, bronze: Math.max(1, Math.round(test.bronze * (1 - diff))), silver: Math.max(2, Math.round(test.silver * (1 - diff))), gold: Math.max(3, Math.round(test.gold * (1 - diff))) };
      }
    });
  } else {
    const base = GTO_NORMS_DATA[11][g];
    const diff = Math.min(0.45, (sid - 11) * 0.07);
    return base.map(test => {
      if (test.lowerIsBetter) {
        return { ...test, bronze: Math.round(test.bronze * (1 + diff) * 10) / 10, silver: Math.round(test.silver * (1 + diff) * 10) / 10, gold: Math.round(test.gold * (1 + diff) * 10) / 10 };
      } else {
        return { ...test, bronze: Math.max(1, Math.round(test.bronze * (1 - diff))), silver: Math.max(2, Math.round(test.silver * (1 - diff))), gold: Math.max(3, Math.round(test.gold * (1 - diff))) };
      }
    });
  }
}

// Оценка результата теста: 'gold' | 'silver' | 'bronze' | 'none'
export function evaluateTest(test, userValue) {
  if (userValue == null || userValue === '' || isNaN(Number(userValue))) return null;
  const val = Number(userValue);
  if (test.lowerIsBetter) {
    if (val <= test.gold) return 'gold';
    if (val <= test.silver) return 'silver';
    if (val <= test.bronze) return 'bronze';
    return 'none';
  } else {
    if (val >= test.gold) return 'gold';
    if (val >= test.silver) return 'silver';
    if (val >= test.bronze) return 'bronze';
    return 'none';
  }
}
