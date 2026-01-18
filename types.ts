
export interface FlashcardData {
  id: string;
  word: string;
  definitionVN: string;
  exampleEN: string;
  exampleVN: string;
  level?: string;
  // SRS Fields
  saved?: boolean;
  interval?: number; // Days
  easeFactor?: number;
  repetitionCount?: number;
  nextReview?: number; // Timestamp
  lastReviewed?: number; // Timestamp
}

export interface Deck {
  id: string;
  name: string;
  cards: FlashcardData[];
  createdAt: number;
}

export type ExtractionMode = 'detect' | 'extract';
export type AppView = 'home' | 'library' | 'stats' | 'practice' | 'exercise' | 'deck-view';
export type VocabularyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ExerciseQuestion {
  id: string;
  type: 'mcq' | 'gap-fill';
  question: string;
  options?: string[]; // For MCQ
  answer: string;
  wordId: string;
  context?: string; // Original example sentence for gap-fill
}
