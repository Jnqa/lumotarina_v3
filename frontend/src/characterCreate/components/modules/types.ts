// types.ts
export type Option = {
  id: string;
  text: string;
  media?: {
    text?: string | null;
    image?: string | null;
    images?: string | null;
    badge?: {
      level?: number;
      label?: string;
    }
  };
  visuals?: {
    progressColor?: string | null;
    progressBg?: string | null;
    background?: string | null;
  };
};

export type Question = {
  id: string;
  text: string;
  type: 'choice';
  options: Option[];
  conditions?: {
    race?: string[];
  };
};

export type Answer = {
  questionId: string;
  optionId: string;
  text: string;
};

export type Character = {
  // Массив объектов Answer
  answers: Answer[]; 
  
  // Объект, где ключи — строки, а значения — числа
  abilities: {
    [abilityName: string]: number;
  };
  
  // Массивы строк
  tags: string[];
  classes: string[];
  
  // Число (исправил опечатку lucoins из вашего JSON)
  lucoins: number; 
};

export type ClassInfo = {
  id: string;
  name: string;
  hidden?: boolean;
  description: string;
  icon?: string;
};

export type ClassData = {
    id: string;
    name: string;
    description: string;
    abilities: any[];
    inventory?: string[];
}

export type CharacterProfile = {
  id: number;
  name: string;
  class: string;
  level: number;
  status: "alive" | "dead" | string; // Можно задать конкретные статусы
  
  // Характеристики и очки
  hp: number;
  hpMax: number;
  armor: number;
  abilityPoints?: number;
  skillpoints?: number;
  // Сложные структуры
  abilities?: {
    [key: string]: number;
  };
  inventory?: string[];
  
  // Текстовые блоки и метаданные
  history?: string;
  story?: string;
  picture?: string; // путь к файлу или URL
  
  // Дата (в TS обычно string, если приходит из JSON/API)
  createdAt?: string; 
};
