import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TeachableUsersService } from "../services/teachable";
import { EmailService } from "../services/email.service";

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

export async function loginUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Email and password are required." });
      return;
    }

    const user = await models.users.findOne({ email });
    if (!user) {
      res.status(HttpStatusCode.Unauthorized).send({ message: "Invalid credentials." });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(HttpStatusCode.Unauthorized).send({ message: "Invalid credentials." });
      return;
    }

    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      console.error("Missing JWT_SECRET env var");
      res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
      return;
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      secret,
      { expiresIn: "7d" },
    );

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

    res.status(HttpStatusCode.Ok).send({ message: "Login successful.", token, user: safeUser });
    return;
  } catch (error) {
    console.error("Error logging in user", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

function randomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*?&";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function registerFromPayment(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const payload = req.body || {};
    const email: string | undefined = payload?.email;
    const transactionStatus: string | undefined = payload?.transactionStatus;
    const statusCode: number | undefined = payload?.statusCode;
    const authorizationCode: string | undefined = payload?.authorizationCode;
    const transactionId: string | number | undefined = payload?.transactionId;
    const amount: number | undefined = payload?.amount;
    const currency: string | undefined = payload?.currency;
    const reference: string | undefined = payload?.reference;

    if (!email || typeof email !== "string") {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Email is required." });
      return;
    }

    if (!(transactionStatus === "Approved" || statusCode === 3)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Transaction must be approved." });
      return;
    }

    const existing = await models.users.findOne({ email }).lean();
    if (existing) {
      res.status(HttpStatusCode.Ok).send({ message: "User already exists.", user: existing });
      return;
    }

    let name = "User";
    if (typeof reference === "string") {
      const parts = reference.split(" - ").map(s => s.trim());
      if (parts.length >= 3) name = parts[parts.length - 2];
    }

  const password = randomPassword(12);
  const user = await models.users.create({ name, email, password });

  if (transactionId || amount || currency) {
      user.payments.push({
        provider: "other",
        amount: Number(amount || 0),
        currency: String(currency || "USD"),
        transactionId: String(transactionId || authorizationCode || ""),
        status: "completed",
        createdAt: new Date(),
      });
      await user.save();
  }

  const teachableService = new TeachableUsersService();
  const teachableRes = await teachableService.createUser({ name, email, password } as any);
  const teachableUserId = (teachableRes as any)?.data?.id ?? (teachableRes as any)?.data?.user?.id;

  if (typeof teachableUserId === "number") {
    user.teachableUserId = teachableUserId;
    await user.save();

    const bodyCourseIds = Array.isArray((payload as any)?.courseIds) ? (payload as any).courseIds : undefined;
    const envCourseIdsRaw = process.env.TEACHABLE_DEFAULT_COURSE_IDS;
    const envSingle = process.env.TEACHABLE_DEFAULT_COURSE_ID;

    let courseIds: number[] = [];
    if (bodyCourseIds) {
      courseIds = bodyCourseIds
        .map((v: any) => Number(v))
        .filter((n: number) => Number.isFinite(n) && n > 0);
    } else if (envCourseIdsRaw && envCourseIdsRaw.trim() !== "") {
      courseIds = envCourseIdsRaw
        .split(",")
        .map(s => Number(s.trim()))
        .filter((n: number) => Number.isFinite(n) && n > 0);
    } else if (envSingle && String(envSingle).trim() !== "") {
      const single = Number(envSingle);
      if (Number.isFinite(single) && single > 0) courseIds = [single];
    }

    courseIds = Array.from(new Set(courseIds)).slice(0, 3);

    for (const cid of courseIds) {
      await teachableService.enrollUser({ user_id: teachableUserId, course_id: cid } as any);
      const exists = (user.courses || []).some((c: any) => Number(c.teachableCourseId) === Number(cid));
      if (!exists) {
        user.courses.push({ teachableCourseId: cid, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
      }
    }
    await user.save();
  }

  const emailService = new EmailService();
  await emailService.sendTemporaryPassword(email, name, password);

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

    res.status(HttpStatusCode.Created).send({ message: "User created and email sent successfully.", user: safeUser });
    return;
  } catch (error) {
    console.error("Error creating user from payment", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}
