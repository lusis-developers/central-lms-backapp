import { models } from "../models";
import { TeachableCoursesService, TeachableUsersService } from "../services/teachable";

let running = false;

async function fetchAllCourseIds(): Promise<number[]> {
  const coursesService = new TeachableCoursesService();
  const per = Number(process.env.SCHEDULER_COURSES_PER || 200);
  let page = 1;
  const out: number[] = [];
  while (true) {
    const res = await coursesService.listCourses({ page, per } as any);
    const data = (res as any)?.data ?? [];
    const ids = (Array.isArray(data) ? data : [])
      .map((c: any) => Number((c as any)?.id))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) break;
    out.push(...ids);
    if (ids.length < per) break;
    page += 1;
  }
  return Array.from(new Set(out));
}

async function enrollMissingCoursesForAllUsers(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const courseIds = await fetchAllCourseIds();
    if (courseIds.length === 0) return;
    const usersService = new TeachableUsersService();
    const batchSize = Number(process.env.SCHEDULER_USERS_BATCH_SIZE || 200);
    const userConcurrency = Number(process.env.SCHEDULER_USERS_CONCURRENCY || 3);
    let skip = 0;
    while (true) {
      const users = await models.users
        .find({}, { teachableUserId: 1, courses: 1 })
        .skip(skip)
        .limit(batchSize)
        .lean();
      if (!users || users.length === 0) break;
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
        const slice = tasks.slice(i, i + userConcurrency);
        runners.push(Promise.all(slice.map((fn) => fn())).then(() => {}));
        i += userConcurrency;
      }
      for (const r of runners) await r;
      skip += users.length;
    }
  } catch (error) {
    console.error("Auto-enroll scheduler error", error);
  } finally {
    running = false;
  }
}

export const initializeSchedulers = () => {
  const intervalMs = Number(process.env.SCHEDULER_ENROLL_INTERVAL_MS || 1000 * 60 * 30);
  setInterval(() => {
    enrollMissingCoursesForAllUsers().catch(() => {});
  }, intervalMs);
};
