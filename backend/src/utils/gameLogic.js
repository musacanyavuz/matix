/**
 * Oyun Mantığı
 * Matematik soruları oluşturma fonksiyonları
 */

// Yaş grubuna göre soru zorluk seviyesi
function getDifficultyConfig(ageGroup) {
  const configs = {
    age4: {
      operations: ['+'],
      additionRange: { min: 1, max: 5 },
      subtractionRange: { min: 1, max: 5 },
      wrongAnswerRange: { min: -3, max: 3 },
    },
    age5: {
      operations: ['+', '-'],
      additionRange: { min: 1, max: 10 },
      subtractionRange: { min: 1, max: 10 },
      wrongAnswerRange: { min: -5, max: 5 },
    },
    age6: {
      operations: ['+', '-'],
      additionRange: { min: 1, max: 15 },
      subtractionRange: { min: 1, max: 15 },
      wrongAnswerRange: { min: -8, max: 8 },
    },
    grade1: {
      operations: ['+', '-'],
      additionRange: { min: 1, max: 20 },
      subtractionRange: { min: 1, max: 20 },
      wrongAnswerRange: { min: -10, max: 10 },
    },
    grade2: {
      operations: ['+', '-', '*'],
      additionRange: { min: 1, max: 50 },
      subtractionRange: { min: 1, max: 50 },
      multiplicationRange: { min: 1, max: 10 },
      wrongAnswerRange: { min: -15, max: 15 },
    },
    grade3: {
      operations: ['+', '-', '*'],
      additionRange: { min: 1, max: 100 },
      subtractionRange: { min: 1, max: 100 },
      multiplicationRange: { min: 1, max: 10 },
      wrongAnswerRange: { min: -20, max: 20 },
    },
    grade4: {
      operations: ['+', '-', '*', '/'],
      additionRange: { min: 1, max: 100 },
      subtractionRange: { min: 1, max: 100 },
      multiplicationRange: { min: 1, max: 12 },
      divisionRange: { min: 2, max: 12 },
      wrongAnswerRange: { min: -25, max: 25 },
    },
  };

  return configs[ageGroup] || configs.grade1;
}

// Rastgele sayı üret
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Yaş grubuna göre matematik sorusu oluştur
 */
function generateQuestion(ageGroup = 'grade1') {
  const config = getDifficultyConfig(ageGroup);
  const operations = config.operations;
  const operation = operations[randomInt(0, operations.length - 1)];

  let num1, num2, correctAnswer;

  switch (operation) {
    case '+':
      num1 = randomInt(config.additionRange.min, config.additionRange.max);
      num2 = randomInt(config.additionRange.min, config.additionRange.max);
      correctAnswer = num1 + num2;
      break;

    case '-':
      num1 = randomInt(config.subtractionRange.min, config.subtractionRange.max);
      num2 = randomInt(1, num1);
      correctAnswer = num1 - num2;
      break;

    case '*':
      num1 = randomInt(config.multiplicationRange.min, config.multiplicationRange.max);
      num2 = randomInt(config.multiplicationRange.min, config.multiplicationRange.max);
      correctAnswer = num1 * num2;
      break;

    case '/':
      num2 = randomInt(config.divisionRange.min, config.divisionRange.max);
      correctAnswer = randomInt(1, Math.floor(config.divisionRange.max / 2));
      num1 = num2 * correctAnswer;
      break;

    default:
      num1 = randomInt(config.additionRange.min, config.additionRange.max);
      num2 = randomInt(config.additionRange.min, config.additionRange.max);
      correctAnswer = num1 + num2;
  }

  const question = `${num1} ${operation} ${num2} = ?`;

  // 5 yanlış cevap oluştur
  const wrongAnswers = new Set();
  while (wrongAnswers.size < 5) {
    const wrong = correctAnswer + randomInt(config.wrongAnswerRange.min, config.wrongAnswerRange.max);
    if (wrong !== correctAnswer && wrong > 0) {
      wrongAnswers.add(wrong);
    }
  }

  // 6 seçenek oluştur (1 doğru + 5 yanlış)
  const options = [correctAnswer, ...Array.from(wrongAnswers)];

  // Seçenekleri karıştır
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    question,
    correctAnswer: correctAnswer.toString(),
    options: options.map((opt) => opt.toString()),
  };
}

module.exports = {
  generateQuestion,
  getDifficultyConfig,
};

