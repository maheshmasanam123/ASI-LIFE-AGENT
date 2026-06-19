declare module 'sentiment' {
  export interface SentimentResult {
    score: number;
    comparative: number;
    positive: string[];
    negative: string[];
    calculation: Array<{ word: string; score: number }>;
    tokens: string[];
    words: string[];
  }

  export class Sentiment {
    analyze(text: string): SentimentResult;
  }
}