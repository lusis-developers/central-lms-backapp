import type { Types } from "mongoose";

export interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface IQuiz {
  _id: Types.ObjectId;
  teachableCourseId: number;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQuizSubmission {
  _id: Types.ObjectId;
  userRef: Types.ObjectId;
  quizRef: Types.ObjectId;
  answers: number[];
  score: number;
  passed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
