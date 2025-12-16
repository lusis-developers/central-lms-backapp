import { UserModel } from "./user.model";
import { TransactionModel } from "./transaction.model";
import { CommentModel } from "./comment.model";
import { CareerModel } from "./career.model";
import { QuizModel } from "./quiz.model";
import { QuizSubmissionModel } from "./quizSubmission.model";
import CertificateModel from "./certificate.model";

export const models = {
  users: UserModel,
  transactions: TransactionModel,
  comments: CommentModel,
  careers: CareerModel,
  quizzes: QuizModel,
  quizSubmissions: QuizSubmissionModel,
  certificates: CertificateModel,
};
