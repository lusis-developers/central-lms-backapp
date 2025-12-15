import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import { models } from "../models";
import type { IQuiz, QuizQuestion } from "../types/quiz";

type PublicQuizQuestion = Pick<QuizQuestion, "prompt" | "options">;
type PublicQuiz = Omit<IQuiz, "questions"> & { questions: PublicQuizQuestion[] };

function parseCourseId(value: unknown): number | undefined {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

export async function createQuiz(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params as { courseId: string };
    const teachableCourseId = parseCourseId(courseId);
    const { title, description, questions } = (req.body || {}) as { title?: string; description?: string; questions?: QuizQuestion[] };

    if (!teachableCourseId) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. title and questions are required." });
      return;
    }

    for (const q of questions) {
      if (typeof q.prompt !== "string" || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Each question must have options and a valid correctIndex." });
        return;
      }
    }

    const quiz = await models.quizzes.create({ teachableCourseId, title, description, questions });

    res.status(HttpStatusCode.Created).send({ message: "Quiz created successfully.", quiz });
    return;
  } catch (error) {
    console.error("Error creating quiz", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function getQuizzesByCourse(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params as { courseId: string };
    const teachableCourseId = parseCourseId(courseId);
    if (!teachableCourseId) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }

    const quizzes = await models.quizzes.find({ teachableCourseId }).lean<IQuiz[]>();
    const publicQuizzes: PublicQuiz[] = quizzes.map((q) => ({
      _id: q._id,
      teachableCourseId: q.teachableCourseId,
      title: q.title,
      description: q.description,
      questions: q.questions.map((qq) => ({ prompt: qq.prompt, options: qq.options })),
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }));
    res.status(HttpStatusCode.Ok).send({ message: "Quizzes retrieved successfully.", quizzes: publicQuizzes });
    return;
  } catch (error) {
    console.error("Error fetching quizzes", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function getQuizByIdController(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { quizId } = req.params as { quizId: string };
    if (!quizId || !Types.ObjectId.isValid(quizId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid quizId is required." });
      return;
    }
    const quiz = await models.quizzes.findById(quizId).lean<IQuiz>();
    if (!quiz) {
      res.status(HttpStatusCode.NotFound).send({ message: "Quiz not found." });
      return;
    }
    const publicQuiz: PublicQuiz = {
      _id: quiz._id,
      teachableCourseId: quiz.teachableCourseId,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map((qq) => ({ prompt: qq.prompt, options: qq.options })),
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
    res.status(HttpStatusCode.Ok).send({ message: "Quiz retrieved successfully.", quiz: publicQuiz });
    return;
  } catch (error) {
    console.error("Error fetching quiz", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function deleteQuiz(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { quizId } = req.params as { quizId: string };
    if (!quizId || !Types.ObjectId.isValid(quizId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid quizId is required." });
      return;
    }
    const quiz = await models.quizzes.findByIdAndDelete(quizId).lean<IQuiz | null>();
    if (!quiz) {
      res.status(HttpStatusCode.NotFound).send({ message: "Quiz not found." });
      return;
    }
    await models.quizSubmissions.deleteMany({ quizRef: new Types.ObjectId(quizId) });
    res.status(HttpStatusCode.Ok).send({ message: "Quiz deleted successfully." });
    return;
  } catch (error) {
    console.error("Error deleting quiz", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function submitQuiz(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { quizId } = req.params as { quizId: string };
    const { userId, answers } = (req.body || {}) as { userId?: string; answers?: number[] };
    if (!quizId || !Types.ObjectId.isValid(quizId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid quizId is required." });
      return;
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid userId is required." });
      return;
    }
    if (!Array.isArray(answers)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. answers must be an array of indices." });
      return;
    }

    const quiz = await models.quizzes.findById(quizId).lean<IQuiz>();
    if (!quiz) {
      res.status(HttpStatusCode.NotFound).send({ message: "Quiz not found." });
      return;
    }

    let score = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      const a = answers[i];
      const correct = quiz.questions[i]?.correctIndex;
      if (typeof a === "number" && typeof correct === "number" && a === correct) score += 1;
    }
    const passed = score >= 9;

    const submission = await models.quizSubmissions.findOneAndUpdate(
      { userRef: new Types.ObjectId(userId), quizRef: new Types.ObjectId(quizId) },
      { answers, score, passed },
      { upsert: true, new: true },
    ).lean();

    res.status(HttpStatusCode.Ok).send({ message: passed ? "Quiz approved." : "Quiz not approved.", score, passed, submission });
    return;
  } catch (error) {
    console.error("Error submitting quiz", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}
