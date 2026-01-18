
import { GoogleGenAI, Type } from "@google/genai";
import { FlashcardData, ExtractionMode, VocabularyLevel, FileData, ExerciseQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const FLASHCARD_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING, description: "The English word or phrase." },
      definitionVN: { type: Type.STRING, description: "Clear Vietnamese definition." },
      exampleEN: { type: Type.STRING, description: "A contextual English example sentence." },
      exampleVN: { type: Type.STRING, description: "Vietnamese translation of the example sentence." },
      level: { type: Type.STRING, description: "Estimated CEFR level of the word (e.g., B2, C1)." },
    },
    required: ["word", "definitionVN", "exampleEN", "exampleVN"],
    propertyOrdering: ["word", "definitionVN", "exampleEN", "exampleVN", "level"],
  },
};

const EXERCISE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      type: { type: Type.STRING, description: "Either 'mcq' or 'gap-fill'" },
      question: { type: Type.STRING, description: "The question text." },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "4 options for MCQ. Use semantically similar words as distractors. Null for gap-fill." 
      },
      answer: { type: Type.STRING, description: "The correct word or definition." },
      wordId: { type: Type.STRING, description: "The ID of the word this question is based on." },
      hint: { type: Type.STRING, description: "A subtle hint for the learner." },
    },
    required: ["id", "type", "question", "answer", "wordId"],
  },
};

export const extractVocabulary = async (
  content: { file?: FileData; text?: string },
  mode: ExtractionMode,
  level: VocabularyLevel = 'B2',
  maxCards: number = 100
): Promise<FlashcardData[]> => {
  const model = "gemini-3-flash-preview";
  
  const detectPrompt = `
    Analyze this content. Identify and extract English vocabulary words that already have Vietnamese definitions or translations provided within the text. 
    Focus on extracting the most useful and academic terms.
    Return a list of up to ${maxCards} cards.
  `;

  const extractPrompt = `
    Analyze the English text provided. Extract up to ${maxCards} English vocabulary words at the ${level} CEFR level. 
    For each word:
    1. Vietnamese definition.
    2. Contextual English example.
    3. Vietnamese translation of example.
  `;

  const promptText = mode === 'detect' ? detectPrompt : extractPrompt;
  const parts: any[] = [];
  
  if (content.file) {
    parts.push({ inlineData: { data: content.file.base64, mimeType: content.file.mimeType } });
  }
  if (content.text) {
    parts.push({ text: `Content: \n\n${content.text}` });
  }
  parts.push({ text: promptText });

  const result = await ai.models.generateContent({
    model,
    contents: [{ parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: FLASHCARD_SCHEMA,
    }
  });

  const responseText = result.text;
  if (!responseText) throw new Error("No response from AI");

  try {
    const cards: any[] = JSON.parse(responseText);
    return cards.map((card, index) => ({
      ...card,
      id: `${Date.now()}-${index}`,
    }));
  } catch (e) {
    throw new Error("AI returned invalid JSON.");
  }
};

export const generateExercises = async (cards: FlashcardData[]): Promise<ExerciseQuestion[]> => {
  const model = "gemini-3-flash-preview";
  const cardsJson = JSON.stringify(cards.map(c => ({ id: c.id, word: c.word, def: c.definitionVN, ex: c.exampleEN })));
  
  const prompt = `
    Create a 10-question high-quality English quiz based on this vocabulary list: ${cardsJson}.
    
    Variety Requirements:
    - 4x MCQ (English Word -> Pick Vietnamese Meaning)
    - 3x MCQ (Vietnamese Definition -> Pick English Word)
    - 3x Gap-fill (Use original examples, replace word with '____')
    
    Difficulty: High. Ensure distractors in MCQs are semantically related words or common pitfalls. 
    Include a 'hint' for every question.
  `;

  const result = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: EXERCISE_SCHEMA,
    }
  });

  const responseText = result.text;
  if (!responseText) throw new Error("No exercise generated");
  return JSON.parse(responseText);
};
