import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import { models } from "../models";
import { TeachableCoursesService, TeachableUsersService } from "../services/teachable";
import { PointsService } from "../services/points";

function parsePositiveNumber(value: any): number | undefined {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

function parseBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return undefined;
}

export async function getCourses(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { name, is_published, author_bio_id, created_at, page, per } = (req.query || {}) as Record<string, any>;
    const metadata = {
      name: typeof name === "string" ? name : undefined,
      is_published: parseBoolean(is_published),
      author_bio_id: author_bio_id ? parsePositiveNumber(author_bio_id) : undefined,
      created_at: typeof created_at === "string" ? created_at : undefined,
      page: page ? parsePositiveNumber(page) : undefined,
      per: per ? parsePositiveNumber(per) : undefined,
    } as any;

    const service = new TeachableCoursesService();
    const { data } = await service.listCourses(metadata);
    res.status(HttpStatusCode.Ok).send({ message: "Courses retrieved successfully.", courses: data });
    return;
  } catch (error: any) {
    console.error("Error fetching courses", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getEnrolledCoursesForUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params;
    const { teachableUserId } = (req.query || {}) as Record<string, any>;

    let courseIds: number[] = [];

    if (userId && Types.ObjectId.isValid(userId)) {
      const user = await models.users.findById(userId).lean();
      if (!user) {
        res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
        return;
      }
      courseIds = (user.courses || [])
        .filter((c: any) => c && c.status === "active")
        .map((c: any) => Number(c.teachableCourseId))
        .filter((n: number) => Number.isFinite(n) && n > 0);
    } else {
      const tId = parsePositiveNumber(teachableUserId);
      if (!tId) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid userId or teachableUserId is required." });
        return;
      }
      const usersService = new TeachableUsersService();
      const { data } = await usersService.showUser({ user_id: tId } as any);
      const enrollments = (data as any)?.enrollments || [];
      courseIds = enrollments
        .map((e: any) => Number(e?.course_id))
        .filter((n: number) => Number.isFinite(n) && n > 0);
    }

    courseIds = Array.from(new Set(courseIds));

    if (courseIds.length === 0) {
      res.status(HttpStatusCode.Ok).send({ message: "No enrolled courses found.", courses: [] });
      return;
    }

    const service = new TeachableCoursesService();
    const results = await Promise.all(
      courseIds.map(async (cid) => {
        try {
          const { data } = await service.showCourse({ course_id: cid } as any);
          return data;
        } catch (_err) {
          return null as any;
        }
      }),
    );
    const courses = results.filter((r: any) => r != null);

    res.status(HttpStatusCode.Ok).send({ message: "Enrolled courses retrieved successfully.", courses });
    return;
  } catch (error: any) {
    console.error("Error fetching enrolled courses", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
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

async function resolveUserId(userId?: string, teachableUserId?: any): Promise<string | undefined> {
  if (userId && Types.ObjectId.isValid(userId)) return userId;
  const parsedTeachable = parsePositiveNumber(teachableUserId);
  if (parsedTeachable) {
    const user = await models.users.findOne({ teachableUserId: parsedTeachable }).lean();
    return user?._id?.toString();
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

export async function enrollUserToAllCourses(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId } = (req.params || {}) as Record<string, any>;
    const { teachableUserId } = (req.query || {}) as Record<string, any>;

    const finalTeachableUserId = await resolveTeachableUserId(userId, teachableUserId);
    if (!finalTeachableUserId) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid teachableUserId or userId is required." });
      return;
    }

    const coursesService = new TeachableCoursesService();
    const usersService = new TeachableUsersService();

    const perDefault = 200;
    let page = 1;
    const collectedIds: number[] = [];

    while (true) {
      let data: any[] = [];
      try {
        const resCourses = await coursesService.listCourses({ page, per: perDefault } as any);
        data = (resCourses as any)?.data ?? [];
      } catch (_err) {
        break;
      }
      const ids = (Array.isArray(data) ? data : [])
        .map((c: any) => Number((c as any)?.id))
        .filter((n: number) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) break;
      collectedIds.push(...ids);
      if (ids.length < perDefault) break;
      page += 1;
    }

    const uniqueCourseIds = Array.from(new Set(collectedIds));

    if (uniqueCourseIds.length === 0) {
      res.status(HttpStatusCode.Ok).send({ message: "No courses available to enroll.", enrolledCourseIds: [], failedCourseIds: [] });
      return;
    }

    const results = await Promise.allSettled(
      uniqueCourseIds.map(async (cid) => {
        await usersService.enrollUser({ user_id: finalTeachableUserId, course_id: cid } as any);
        return cid;
      }),
    );

    const enrolledCourseIds: number[] = [];
    const failedCourseIds: number[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") enrolledCourseIds.push(r.value as number);
      else {
        const reason: any = (r as any).reason;
        const cid = Number(reason?.course_id ?? reason?.metadata?.course_id);
        if (Number.isFinite(cid) && cid > 0) failedCourseIds.push(cid);
      }
    }

    if (userId && Types.ObjectId.isValid(userId)) {
      const localUser = await models.users.findById(userId);
      if (localUser) {
        for (const cid of enrolledCourseIds) {
          const exists = (localUser.courses || []).some((c: any) => Number(c.teachableCourseId) === Number(cid));
          if (!exists) {
            localUser.courses.push({ teachableCourseId: cid, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
          }
        }
        await localUser.save();
      }
    }

    res.status(HttpStatusCode.Ok).send({ message: "User enrolled in all courses successfully.", enrolledCourseIds, failedCourseIds });
    return;
  } catch (error: any) {
    console.error("Error enrolling user in all courses", error);
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
    const raw: any = data as any;
    const courseObj: any = raw?.course ?? raw;
    const sections: any[] = Array.isArray(courseObj?.lecture_sections) ? [...courseObj.lecture_sections] : [];
    sections.sort((a: any, b: any) => {
      const pa = Number(a?.position);
      const pb = Number(b?.position);
      const va = Number.isFinite(pa) ? pa : Number.MAX_SAFE_INTEGER;
      const vb = Number.isFinite(pb) ? pb : Number.MAX_SAFE_INTEGER;
      return va - vb;
    });
    for (const s of sections) {
      if (Array.isArray(s?.lectures)) {
        s.lectures = [...s.lectures].sort((la: any, lb: any) => {
          const pa = Number(la?.position);
          const pb = Number(lb?.position);
          const va = Number.isFinite(pa) ? pa : Number.MAX_SAFE_INTEGER;
          const vb = Number.isFinite(pb) ? pb : Number.MAX_SAFE_INTEGER;
          return va - vb;
        });
      }
    }
    const orderedCourse = { ...courseObj, lecture_sections: sections };
    const finalData = raw?.course ? { ...raw, course: orderedCourse } : orderedCourse;
    res.status(HttpStatusCode.Ok).send({ message: "Course retrieved successfully.", course: finalData });
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

    // Award points for completing the lecture
    const resolvedUserId = await resolveUserId(userId, teachableUserId);
    if (resolvedUserId) {
      const pointsService = new PointsService();
      await pointsService.awardLecturePoint(resolvedUserId, courseIdNum, lectureIdNum);
    }

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

export async function getNextVideo(
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
    const { data: lectureData } = await service.showLecture({ course_id: courseIdNum, lecture_id: lectureIdNum } as any);

    function extractCandidates(obj: any): Array<{ id: number; position?: number }> {
      const out: Array<{ id: number; position?: number }> = [];
      if (!obj || typeof obj !== "object") return out;
      for (const key of Object.keys(obj)) {
        const val = (obj as any)[key];
        if (Array.isArray(val)) {
          const keyLower = key.toLowerCase();
          const looksLikeVideos = keyLower.includes("video");
          if (looksLikeVideos) {
            for (const item of val) {
              const id = Number((item as any)?.id);
              const position = Number((item as any)?.position);
              if (Number.isFinite(id) && id > 0) {
                out.push({ id, position: Number.isFinite(position) ? position : undefined });
              }
            }
          } else {
            // Scan nested arrays for items with type: 'video'
            for (const item of val) {
              const type = String((item as any)?.type || "").toLowerCase();
              const id = Number((item as any)?.id);
              const position = Number((item as any)?.position);
              if (type.includes("video") && Number.isFinite(id) && id > 0) {
                out.push({ id, position: Number.isFinite(position) ? position : undefined });
              }
            }
          }
        } else if (val && typeof val === "object") {
          out.push(...extractCandidates(val));
        }
      }
      return out;
    }

    let videos = extractCandidates(lectureData);
    if (videos.length === 0) {
      res.status(HttpStatusCode.NotFound).send({ message: "No videos found in lecture." });
      return;
    }

    videos = videos.sort((a, b) => {
      const pa = a.position ?? Number.MAX_SAFE_INTEGER;
      const pb = b.position ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return a.id - b.id;
    });

    const idx = videos.findIndex(v => Number(v.id) === Number(videoIdNum));
    const next = idx >= 0 ? videos[idx + 1] : videos.find(v => v.id > videoIdNum);

    if (!next) {
      res.status(HttpStatusCode.Ok).send({ message: "No next video available.", next: null });
      return;
    }

    const { data: nextData } = await service.showVideo({ course_id: courseIdNum, lecture_id: lectureIdNum, video_id: next.id } as any);
    res.status(HttpStatusCode.Ok).send({ message: "Next video retrieved successfully.", next: nextData });
    return;
  } catch (error: any) {
    console.error("Error fetching next video", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function enrollAllUsersToAllCourses(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const coursesService = new TeachableCoursesService();
    const usersService = new TeachableUsersService();

    const perDefault = 200;
    let page = 1;
    const collectedIds: number[] = [];
    while (true) {
      let data: any[] = [];
      try {
        const resCourses = await coursesService.listCourses({ page, per: perDefault } as any);
        data = (resCourses as any)?.data ?? [];
      } catch (_err) {
        break;
      }
      const ids = (Array.isArray(data) ? data : [])
        .map((c: any) => Number((c as any)?.id))
        .filter((n: number) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) break;
      collectedIds.push(...ids);
      if (ids.length < perDefault) break;
      page += 1;
    }

    let courseIds = Array.from(new Set(collectedIds));
    if (courseIds.length === 0) {
      const name = "FudMasters Growth Essentials";
      const career = await models.careers.findOne({ name }).lean();
      const localIds: number[] = Array.isArray((career as any)?.courseIds)
        ? (career as any).courseIds.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
      courseIds = Array.from(new Set(localIds));
    }
    if (courseIds.length === 0) {
      res.status(HttpStatusCode.Ok).send({ message: "No courses available to enroll.", processedUsers: 0, enrolledCount: 0 });
      return;
    }

    const batchSize = 200;
    const concurrency = 3;
    let skip = 0;
    let processedUsers = 0;
    let enrolledOperations = 0;

    while (true) {
      const users = await models.users
        .find({ accountType: "founder" }, { teachableUserId: 1, courses: 1 })
        .skip(skip)
        .limit(batchSize)
        .lean();
      if (!users || users.length === 0) break;
      processedUsers += users.length;

      const tasks = users.map((u: any) => async () => {
        const tId = Number(u?.teachableUserId);
        if (!Number.isFinite(tId) || tId <= 0) return;
        const owned = Array.isArray(u?.courses)
          ? u.courses
              .map((c: any) => Number(c?.teachableCourseId))
              .filter((n: number) => Number.isFinite(n) && n > 0)
          : [];
        const missing = courseIds.filter((id) => !owned.includes(id));
        if (missing.length === 0) return;
        for (const cid of missing) {
          try {
            await usersService.enrollUser({ user_id: tId, course_id: cid } as any);
            enrolledOperations += 1;
          } catch (_err) {}
        }
        const localUser = await models.users.findById(u._id);
        if (localUser) {
          for (const cid of missing) {
            const exists = (localUser.courses || []).some((c: any) => Number(c.teachableCourseId) === Number(cid));
            if (!exists) {
              localUser.courses.push({ teachableCourseId: cid, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
            }
          }
          await localUser.save();
        }
      });

      let i = 0;
      const runners: Promise<void>[] = [];
      while (i < tasks.length) {
        const slice = tasks.slice(i, i + concurrency);
        runners.push(Promise.all(slice.map((fn) => fn())).then(() => {}));
        i += concurrency;
      }
      for (const r of runners) await r;
      skip += users.length;
    }

    res.status(HttpStatusCode.Ok).send({ message: "All founders enrolled to all courses successfully.", processedUsers, enrolledCount: enrolledOperations });
    return;
  } catch (error: any) {
    console.error("Error enrolling all founders to all courses", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function revokeAccessForNonFounders(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const usersService = new TeachableUsersService();
    const batchSize = 50; // Smaller batch for safety
    const concurrency = 3;
    let processedUsers = 0;
    let revokedOperations = 0;

    while (true) {
      // Find users who are NOT founders and have at least one course
      // We keep skip at 0 because we are modifying documents to no longer match the query
      const users = await models.users
        .find(
          { 
            accountType: { $ne: "founder" }, 
            courses: { $exists: true, $not: { $size: 0 } } 
          }, 
          { teachableUserId: 1, courses: 1 }
        )
        .limit(batchSize);

      if (!users || users.length === 0) break;
      processedUsers += users.length;

      const tasks = users.map((u) => async () => {
        const tId = Number(u.teachableUserId);
        const coursesToRevoke = u.courses || [];
        
        if (coursesToRevoke.length === 0) return;

        // Revoke in Teachable if valid teachableUserId
        if (Number.isFinite(tId) && tId > 0) {
          for (const course of coursesToRevoke) {
             const cId = Number(course.teachableCourseId);
             if (Number.isFinite(cId) && cId > 0) {
                try {
                  await usersService.unenrollUser({ user_id: tId, course_id: cId });
                  revokedOperations++;
                } catch (err) {
                  // Ignore 404s (already unenrolled)
                  console.error(`Failed to unenroll user ${tId} from course ${cId}`, err);
                }
             }
          }
        }

        // Update local DB: Remove all courses
        u.courses = [];
        await u.save();
      });

      let i = 0;
      const runners: Promise<void>[] = [];
      while (i < tasks.length) {
        const slice = tasks.slice(i, i + concurrency);
        runners.push(Promise.all(slice.map((fn) => fn())).then(() => {}));
        i += concurrency;
      }
      for (const r of runners) await r;
    }

    res.status(HttpStatusCode.Ok).send({ 
      message: "Revocation process completed successfully.", 
      processedUsers, 
      revokedOperations 
    });
    return;
  } catch (error: any) {
    console.error("Error revoking access for non-founders", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}
