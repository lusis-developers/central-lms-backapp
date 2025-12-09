import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import { models } from "../models";
import { TeachableCoursesService, TeachableUsersService } from "../services/teachable";

function parsePositiveNumber(value: any): number | undefined {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

async function resolveTeachableUserId(userId?: string, teachableUserId?: any): Promise<number | undefined> {
  const parsedTeachable = parsePositiveNumber(teachableUserId);
  if (parsedTeachable) return parsedTeachable;
  if (userId && Types.ObjectId.isValid(userId)) {
    const user = await models.users.findById(userId).lean();
    const id = parsePositiveNumber(user?.teachableUserId);
    if (id) return id;
  }
  return undefined;
}

export async function enrollUserToCourse(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    if (!courseIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }

    const { userId, teachableUserId } = (req.body || {}) as Record<string, any>;
    const finalTeachableUserId = await resolveTeachableUserId(userId, teachableUserId);
    if (!finalTeachableUserId) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid teachableUserId or userId is required." });
      return;
    }

    const usersService = new TeachableUsersService();
    await usersService.enrollUser({ user_id: finalTeachableUserId, course_id: courseIdNum } as any);

    if (userId && Types.ObjectId.isValid(userId)) {
      const localUser = await models.users.findById(userId);
      if (localUser) {
        const exists = (localUser.courses || []).some((c: any) => Number(c.teachableCourseId) === Number(courseIdNum));
        if (!exists) {
          localUser.courses.push({ teachableCourseId: courseIdNum, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
          await localUser.save();
        }
      }
    }

    res.status(HttpStatusCode.NoContent).send({ message: "User enrolled successfully." });
    return;
  } catch (error: any) {
    console.error("Error enrolling user in course", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getCourseById(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    if (!courseIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }

    const service = new TeachableCoursesService();
    const { data } = await service.showCourse({ course_id: courseIdNum } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Course retrieved successfully.", course: data });
    return;
  } catch (error: any) {
    console.error("Error fetching course", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getCourseEnrollments(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    if (!courseIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }

    const { enrolled_in_after, enrolled_in_before, sort_direction, page, per } = (req.query || {}) as Record<string, any>;
    const metadata = {
      course_id: courseIdNum,
      enrolled_in_after: typeof enrolled_in_after === "string" ? enrolled_in_after : undefined,
      enrolled_in_before: typeof enrolled_in_before === "string" ? enrolled_in_before : undefined,
      sort_direction: typeof sort_direction === "string" ? sort_direction : undefined,
      page: page ? parsePositiveNumber(page) : undefined,
      per: per ? parsePositiveNumber(per) : undefined,
    } as any;

    const service = new TeachableCoursesService();
    const { data } = await service.showCourseEnrollments(metadata);
    res.status(HttpStatusCode.Ok).send({ message: "Course enrollments retrieved successfully.", enrollments: data });
    return;
  } catch (error: any) {
    console.error("Error fetching course enrollments", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getLectureById(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId, lectureId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    const lectureIdNum = parsePositiveNumber(lectureId);
    if (!courseIdNum || !lectureIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. Valid courseId and lectureId are required." });
      return;
    }

    const service = new TeachableCoursesService();
    const { data } = await service.showLecture({ course_id: courseIdNum, lecture_id: lectureIdNum } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Lecture retrieved successfully.", lecture: data });
    return;
  } catch (error: any) {
    console.error("Error fetching lecture", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function completeLectureForUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId, lectureId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    const lectureIdNum = parsePositiveNumber(lectureId);
    if (!courseIdNum || !lectureIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. Valid courseId and lectureId are required." });
      return;
    }

    const { userId, teachableUserId } = (req.body || {}) as Record<string, any>;
    const finalTeachableUserId = await resolveTeachableUserId(userId, teachableUserId);
    if (!finalTeachableUserId) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid teachableUserId or userId is required." });
      return;
    }

    const service = new TeachableCoursesService();
    await service.markLectureComplete({ user_id: finalTeachableUserId } as any, { course_id: courseIdNum, lecture_id: lectureIdNum } as any);
    res.status(HttpStatusCode.NoContent).send({ message: "Lecture marked as complete." });
    return;
  } catch (error: any) {
    console.error("Error marking lecture complete", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getCourseProgressForUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId, userId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    if (!courseIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }

    const { teachableUserId, page, per } = (req.query || {}) as Record<string, any>;
    const finalTeachableUserId = await resolveTeachableUserId(userId, teachableUserId);
    if (!finalTeachableUserId) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid teachableUserId or userId is required." });
      return;
    }

    const service = new TeachableCoursesService();
    const { data } = await service.courseProgress({ course_id: courseIdNum, user_id: finalTeachableUserId, page: page ? parsePositiveNumber(page) : undefined, per: per ? parsePositiveNumber(per) : undefined } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Course progress retrieved successfully.", progress: data });
    return;
  } catch (error: any) {
    console.error("Error fetching course progress", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getLectureQuizzes(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId, lectureId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    const lectureIdNum = parsePositiveNumber(lectureId);
    if (!courseIdNum || !lectureIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. Valid courseId and lectureId are required." });
      return;
    }

    const service = new TeachableCoursesService();
    const { data } = await service.listQuizzes({ course_id: courseIdNum, lecture_id: lectureIdNum } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Quizzes retrieved successfully.", quizzes: data });
    return;
  } catch (error: any) {
    console.error("Error fetching quizzes", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getQuizById(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId, lectureId, quizId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    const lectureIdNum = parsePositiveNumber(lectureId);
    const quizIdNum = parsePositiveNumber(quizId);
    if (!courseIdNum || !lectureIdNum || !quizIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. Valid courseId, lectureId and quizId are required." });
      return;
    }

    const service = new TeachableCoursesService();
    const { data } = await service.showQuiz({ course_id: courseIdNum, lecture_id: lectureIdNum, quiz_id: quizIdNum } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Quiz retrieved successfully.", quiz: data });
    return;
  } catch (error: any) {
    console.error("Error fetching quiz", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getQuizResponses(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId, lectureId, quizId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    const lectureIdNum = parsePositiveNumber(lectureId);
    const quizIdNum = parsePositiveNumber(quizId);
    if (!courseIdNum || !lectureIdNum || !quizIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. Valid courseId, lectureId and quizId are required." });
      return;
    }

    const service = new TeachableCoursesService();
    const { data } = await service.showQuizResponses({ course_id: courseIdNum, lecture_id: lectureIdNum, quiz_id: quizIdNum } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Quiz responses retrieved successfully.", responses: data });
    return;
  } catch (error: any) {
    console.error("Error fetching quiz responses", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getVideoById(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId, lectureId, videoId } = req.params;
    const courseIdNum = parsePositiveNumber(courseId);
    const lectureIdNum = parsePositiveNumber(lectureId);
    const videoIdNum = parsePositiveNumber(videoId);
    if (!courseIdNum || !lectureIdNum || !videoIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. Valid courseId, lectureId and videoId are required." });
      return;
    }

    const service = new TeachableCoursesService();
    const { data } = await service.showVideo({ course_id: courseIdNum, lecture_id: lectureIdNum, video_id: videoIdNum } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Video retrieved successfully.", video: data });
    return;
  } catch (error: any) {
    console.error("Error fetching video", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}
