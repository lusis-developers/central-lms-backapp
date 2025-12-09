import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";
import { TeachableUsersService } from "../services/teachable";

export async function createUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Name, email and password are required." });
      return;
    }

    const existing = await models.users.findOne({ email }).lean();
    if (existing) {
      res.status(HttpStatusCode.Conflict).send({ message: "User already exists." });
      return;
    }

    const user = await models.users.create({ name, email, password });

    const teachableService = new TeachableUsersService();
    const teachableRes = await teachableService.createUser({ name, email, password } as any);
    const teachableUserId = (teachableRes as any)?.data?.id ?? (teachableRes as any)?.data?.user?.id;

    if (typeof teachableUserId === "number") {
      user.teachableUserId = teachableUserId;
      await user.save();

      const requestedCourseId = req.body?.courseId;
      const defaultCourseId = process.env.TEACHABLE_DEFAULT_COURSE_ID;
      const courseIdValue = requestedCourseId ?? defaultCourseId;

      if (courseIdValue !== undefined && courseIdValue !== null && String(courseIdValue).trim() !== "") {
        const courseIdNumber = Number(courseIdValue);
        if (!Number.isNaN(courseIdNumber) && courseIdNumber > 0) {
          await teachableService.enrollUser({ user_id: teachableUserId, course_id: courseIdNumber } as any);
          user.courses.push({ teachableCourseId: courseIdNumber, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
          await user.save();
        }
      }
    }

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      teachableUserId: user.teachableUserId,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };

    res.status(HttpStatusCode.Created).send({ message: "User created successfully.", user: safeUser });
    return;
  } catch (error) {
    console.error("Error creating user", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}
