import { Schema, model } from "mongoose";
import type { IQuiz, QuizQuestion } from "../types/quiz";

const QuizQuestionSchema = new Schema<QuizQuestion>(
  {
    prompt: { type: String, required: true },
    options: { type: [String], required: true, validate: [(arr: string[]) => Array.isArray(arr) && arr.length >= 2, "options must have at least 2 items"] },
    correctIndex: { type: Number, required: true },
  },
  { _id: false },
);

const QuizSchema = new Schema<IQuiz>(
  {
    teachableCourseId: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    questions: { type: [QuizQuestionSchema], default: [], validate: [(arr: QuizQuestion[]) => Array.isArray(arr) && arr.length > 0, "questions must have at least 1 item"] },
  },
  { timestamps: true, versionKey: false },
);

QuizSchema.path("questions").validate(function (questions: QuizQuestion[]) {
  for (const q of questions) {
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= q.options.length) return false;
  }
  return true;
}, "invalid questions configuration");

export const QuizModel = model<IQuiz>("quizzes", QuizSchema);
