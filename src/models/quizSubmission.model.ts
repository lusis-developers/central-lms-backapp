import { Schema, model, Types } from "mongoose";
import type { IQuizSubmission } from "../types/quiz";

const QuizSubmissionSchema = new Schema<IQuizSubmission>(
  {
    userRef: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    quizRef: { type: Schema.Types.ObjectId, ref: "quizzes", required: true, index: true },
    answers: { type: [Number], default: [] },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
  },
  { timestamps: true, versionKey: false },
);

QuizSubmissionSchema.index({ userRef: 1, quizRef: 1 }, { unique: true });

export const QuizSubmissionModel = model<IQuizSubmission>("quiz_submissions", QuizSubmissionSchema);
