export type Option = {
  id: string;
  text: string;
  media?: {
    text?: string | null;
    image?: string | null;
    images?: string[] | string | null;
    'images-json'?: string | null;  // S3 URL to folder with images.json
    badge?: {
      level?: number;
      label?: string;
    }
    [key: string]: any;  // Allow additional fields
  };
  visuals?: {
    progressColor?: string | null;
    progressBg?: string | null;
    background?: string | null;
  };
  effects?: {
    abilities?: Record<string, number>;
    tags?: string[];
    classes?: string[];
  };
  conditions?: {
    require?: Record<string, string[]>;
    exclude?: Record<string, string[]>;
  };
};

export type Question = {
  id: string;
  text: string;
  description?: string;  // Description shown before options
  type: 'choice' | 'city' | 'world';
  options: Option[];
  conditions?: {
    [key: string]: any;
  };
};

export type City = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  images: string[];
};

export type Answer = {
  questionId: string;
  optionId: string;
  text: string;
};

export type Character = {
  answers: Answer[];
  abilities: Record<string, number>;
  tags: string[];
  classes: string[];
  lucoins?: number;
};
