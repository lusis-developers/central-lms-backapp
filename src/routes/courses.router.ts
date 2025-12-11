import { Router } from "express";
import {
  getCourses,
  getEnrolledCoursesForUser,
  enrollUserToCourse,
  enrollUserToAllCourses,
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

const coursesRouter = Router();

coursesRouter.get("/", getCourses);
coursesRouter.get("/enrolled/:userId", getEnrolledCoursesForUser);
coursesRouter.post("/enroll-all/:userId", enrollUserToAllCourses);
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
coursesRouter.get("/:courseId/lectures/:lectureId/videos/:videoId/next", getNextVideo);

export default coursesRouter;
