import { Router } from "express";
import {
  getCourses,
  getEnrolledCoursesForUser,
  enrollUserToCourse,
  enrollUserToAllCourses,
  enrollAllUsersToAllCourses,
  getCourseById,
  getCourseEnrollments,
  getLectureById,
  completeLectureForUser,
  getCourseProgressForUser,
  getLectureQuizzes,
  getQuizById,
  getQuizResponses,
  getVideoById,
  getNextVideo,
} from "../controllers/courses.controller";
import { createQuiz, getQuizzesByCourse, getQuizByIdController, deleteQuiz, submitQuiz } from "../controllers/quizzes.controller";
import { generateCertificateController, downloadCertificateController, generateCertificateByCourseController, downloadCertificateByCourseController } from "../controllers/certificates.controller";

const coursesRouter = Router();

// ADMIN endpoints
// Create and manage enrollments at scale, and manage course quizzes
coursesRouter.post("/enroll-all/:userId", enrollUserToAllCourses);
coursesRouter.post("/enroll-all-users", enrollAllUsersToAllCourses);
coursesRouter.get("/:courseId/enrollments", getCourseEnrollments);
coursesRouter.post("/:courseId/quizzes", createQuiz);
coursesRouter.delete("/:courseId/quizzes/:quizId", deleteQuiz);

// USER endpoints
// Discover courses, enroll, consume content, and take quizzes
coursesRouter.get("/", getCourses);
coursesRouter.get("/enrolled/:userId", getEnrolledCoursesForUser);
coursesRouter.get("/:courseId", getCourseById);
coursesRouter.post("/:courseId/enroll", enrollUserToCourse);
coursesRouter.post("/:courseId/join", enrollUserToCourse);
coursesRouter.get("/:courseId/lectures/:lectureId", getLectureById);
coursesRouter.post("/:courseId/lectures/:lectureId/complete", completeLectureForUser);
coursesRouter.get("/:courseId/progress/:userId", getCourseProgressForUser);
coursesRouter.get("/:courseId/lectures/:lectureId/quizzes", getLectureQuizzes);
coursesRouter.get("/:courseId/lectures/:lectureId/quizzes/:quizId", getQuizById);
coursesRouter.get("/:courseId/lectures/:lectureId/quizzes/:quizId/responses", getQuizResponses);
coursesRouter.get("/:courseId/lectures/:lectureId/videos/:videoId", getVideoById);
coursesRouter.get("/:courseId/lectures/:lectureId/videos/:videoId/next", getNextVideo);


// User quiz endpoints (public output; correct answers are not returned)
// List quizzes available for a course
coursesRouter.get("/:courseId/quizzes", getQuizzesByCourse);
// Get a single quiz (without correctIndex for each question)
coursesRouter.get("/:courseId/quizzes/:quizId", getQuizByIdController);
// Submit answers to a quiz for evaluation
coursesRouter.post("/:courseId/quizzes/:quizId/submit", submitQuiz);

// Generate Certificate
coursesRouter.post("/:courseId/quizzes/:quizId/certificate", generateCertificateController);
// Generate Certificate by Course (auto-detect quiz)
coursesRouter.post("/:courseId/certificate", generateCertificateByCourseController);
// Download Certificate
coursesRouter.get("/:courseId/quizzes/:quizId/certificate", downloadCertificateController);
// Download Certificate by Course
coursesRouter.get("/:courseId/certificate", downloadCertificateByCourseController);

export default coursesRouter;
