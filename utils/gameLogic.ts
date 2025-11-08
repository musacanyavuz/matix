// Matematik soruları oluşturma fonksiyonları
import { AgeGroup } from '../constants/ageGroups';

export interface Question {
  question: string;
  correctAnswer: number;
  options: number[];
}

// Rastgele sayı üret (min ve max dahil)
const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Yaş grubuna göre soru zorluk seviyesi
interface DifficultyConfig {
  operations: string[];
  additionRange: { min: number; max: number };
  subtractionRange: { min: number; max: number };
  multiplicationRange: { min: number; max: number };
  divisionRange: { min: number; max: number };
  wrongAnswerRange: { min: number; max: number };
}

const getDifficultyConfig = (ageGroup: AgeGroup): DifficultyConfig => {
  switch (ageGroup) {
    case 'age4':
      return {
        operations: ['+'],
        additionRange: { min: 1, max: 5 },
        subtractionRange: { min: 1, max: 5 },
        multiplicationRange: { min: 1, max: 3 },
        divisionRange: { min: 2, max: 5 },
        wrongAnswerRange: { min: -3, max: 3 },
      };
    
    case 'age5':
      return {
        operations: ['+', '-'],
        additionRange: { min: 1, max: 10 },
        subtractionRange: { min: 1, max: 10 },
        multiplicationRange: { min: 1, max: 5 },
        divisionRange: { min: 2, max: 5 },
        wrongAnswerRange: { min: -5, max: 5 },
      };
    
    case 'age6':
      return {
        operations: ['+', '-'],
        additionRange: { min: 1, max: 15 },
        subtractionRange: { min: 1, max: 15 },
        multiplicationRange: { min: 1, max: 5 },
        divisionRange: { min: 2, max: 6 },
        wrongAnswerRange: { min: -8, max: 8 },
      };
    
    case 'grade1':
      return {
        operations: ['+', '-'],
        additionRange: { min: 1, max: 20 },
        subtractionRange: { min: 1, max: 20 },
        multiplicationRange: { min: 1, max: 5 },
        divisionRange: { min: 2, max: 6 },
        wrongAnswerRange: { min: -10, max: 10 },
      };
    
    case 'grade2':
      return {
        operations: ['+', '-', '*'],
        additionRange: { min: 1, max: 50 },
        subtractionRange: { min: 1, max: 50 },
        multiplicationRange: { min: 1, max: 10 },
        divisionRange: { min: 2, max: 10 },
        wrongAnswerRange: { min: -15, max: 15 },
      };
    
    case 'grade3':
      return {
        operations: ['+', '-', '*'],
        additionRange: { min: 1, max: 100 },
        subtractionRange: { min: 1, max: 100 },
        multiplicationRange: { min: 1, max: 10 },
        divisionRange: { min: 2, max: 10 },
        wrongAnswerRange: { min: -20, max: 20 },
      };
    
    case 'grade4':
      return {
        operations: ['+', '-', '*', '/'],
        additionRange: { min: 1, max: 100 },
        subtractionRange: { min: 1, max: 100 },
        multiplicationRange: { min: 1, max: 12 },
        divisionRange: { min: 2, max: 12 },
        wrongAnswerRange: { min: -25, max: 25 },
      };
    
    default:
      return {
        operations: ['+', '-'],
        additionRange: { min: 1, max: 20 },
        subtractionRange: { min: 1, max: 20 },
        multiplicationRange: { min: 1, max: 5 },
        divisionRange: { min: 2, max: 6 },
        wrongAnswerRange: { min: -10, max: 10 },
      };
  }
};

// Yaş grubuna göre matematik sorusu oluştur
export const generateQuestion = (ageGroup: AgeGroup): Question => {
  const config = getDifficultyConfig(ageGroup);
  const operations = config.operations;
  const operation = operations[randomInt(0, operations.length - 1)];
  
  let num1: number, num2: number, correctAnswer: number;
  
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
  
  // 5 yanlış cevap oluştur (yaş grubuna göre aralık)
  const wrongAnswers = new Set<number>();
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
    correctAnswer,
    options,
  };
};

