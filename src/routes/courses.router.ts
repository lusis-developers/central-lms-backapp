import { Router } from "express";
import {
  getCourses,
  enrollUserToCourse,
  getCourseById,
  getCourseEnrollments,
  getLectureById,
  completeLectureForUser,
  getCourseProgressForUser,
  getLectureQuizzes,
  getQuizById,
  getQuizResponses,
  getVideoById,
} from "../controllers/courses.controller";

const coursesRouter = Router();

coursesRouter.get("/", getCourses);
coursesRouter.get("/:courseId", getCourseById);
coursesRouter.get("/:courseId/enrollments", getCourseEnrollments);
coursesRouter.post("/:courseId/enroll", enrollUserToCourse);
coursesRouter.get("/:courseId/lectures/:lectureId", getLectureById);
coursesRouter.post("/:courseId/lectures/:lectureId/complete", completeLectureForUser);
coursesRouter.get("/:courseId/progress/:userId", getCourseProgressForUser);
coursesRouter.get("/:courseId/lectures/:lectureId/quizzes", getLectureQuizzes);
coursesRouter.get("/:courseId/lectures/:lectureId/quizzes/:quizId", getQuizById);
coursesRouter.get("/:courseId/lectures/:lectureId/quizzes/:quizId/responses", getQuizResponses);
coursesRouter.get("/:courseId/lectures/:lectureId/videos/:videoId", getVideoById);

export default coursesRouter;
