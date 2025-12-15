import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";
import { Types } from "mongoose";
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
      gender: (user as any).gender,
      genderOther: (user as any).genderOther,
      dateOfBirth: (user as any).dateOfBirth,
      heardAboutUs: (user as any).heardAboutUs,
      heardAboutUsOther: (user as any).heardAboutUsOther,
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

export async function getUserById(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params as Record<string, string>;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const user = await models.users.findById(userId).lean();
    if (!user) {
      res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
      return;
    }

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      teachableUserId: user.teachableUserId,
      gender: (user as any).gender,
      genderOther: (user as any).genderOther,
      dateOfBirth: (user as any).dateOfBirth,
      heardAboutUs: (user as any).heardAboutUs,
      heardAboutUsOther: (user as any).heardAboutUsOther,
      points: user.points,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      transactions: user.transactions,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };

    res.status(HttpStatusCode.Ok).send({ message: "User retrieved successfully.", user: safeUser });
    return;
  } catch (error) {
    console.error("Error fetching user", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function checkUserByEmail(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { email } = (req.query || {}) as Record<string, any>;
    const value = typeof email === "string" ? email.trim() : "";
    if (!value) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid email is required." });
      return;
    }

    const user = await models.users.findOne({ email: value }).lean();
    if (!user) {
      res.status(HttpStatusCode.Ok).send({ message: "User not found.", exists: false });
      return;
    }

    const safeUser = {
      _id: user._id,
      email: user.email,
      teachableUserId: user.teachableUserId,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };

    res.status(HttpStatusCode.Ok).send({ message: "User exists.", exists: true, user: safeUser });
    return;
  } catch (error) {
    console.error("Error checking user email", error);
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
      gender: (user as any).gender,
      genderOther: (user as any).genderOther,
      dateOfBirth: (user as any).dateOfBirth,
      heardAboutUs: (user as any).heardAboutUs,
      heardAboutUsOther: (user as any).heardAboutUsOther,
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

    const mandatoryCourseId = 2916425;
    const prioritized = [mandatoryCourseId, ...courseIds.filter((id) => id !== mandatoryCourseId)];
    courseIds = Array.from(new Set(prioritized)).slice(0, 3);

    for (const cid of courseIds) {
      let enrolledRemotely = false;
      try {
        await teachableService.enrollUser({ user_id: teachableUserId, course_id: cid } as any);
        enrolledRemotely = true;
      } catch (err: any) {
        const status = Number((err as any)?.status || (err as any)?.response?.status);
        const msg = String((err as any)?.data?.message || (err as any)?.message || "").toLowerCase();
        if (status === 422 || msg.includes("already enrolled")) {
          enrolledRemotely = true;
        } else {
          console.error("Teachable enroll error", { courseId: cid, error: err });
        }
      }
      const exists = (user.courses || []).some((c: any) => Number(c.teachableCourseId) === Number(cid));
      if (enrolledRemotely && !exists) {
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
      gender: (user as any).gender,
      genderOther: (user as any).genderOther,
      dateOfBirth: (user as any).dateOfBirth,
      heardAboutUs: (user as any).heardAboutUs,
      heardAboutUsOther: (user as any).heardAboutUsOther,
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

export async function updateUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params as Record<string, string>;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const allowedGenders = ["male", "female", "prefer_not_to_say", "other"] as const;
    const allowedHeard = [
      "social_media_ad",
      "friend_colleague",
      "search_engine",
      "online_article_blog",
      "youtube_video",
      "podcast",
      "event_webinar",
      "email_campaign",
      "teachable_marketplace",
      "other",
    ] as const;

    const { name, email, gender, genderOther, dateOfBirth, heardAboutUs, heardAboutUsOther } = (req.body || {}) as Record<string, any>;

    const user = await models.users.findById(userId);
    if (!user) {
      res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
      return;
    }

    if (typeof name === "string" && name.trim() !== "") {
      user.name = name.trim();
    }

    if (typeof email === "string" && email.trim() !== "" && email.trim() !== user.email) {
      const conflict = await models.users.findOne({ email: email.trim(), _id: { $ne: user._id } }).lean();
      if (conflict) {
        res.status(HttpStatusCode.Conflict).send({ message: "Email already in use." });
        return;
      }
      user.email = email.trim();
    }

    if (typeof gender === "string") {
      const g = gender.trim().toLowerCase();
      if (!allowedGenders.includes(g as any)) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Gender value is not allowed." });
        return;
      }
      (user as any).gender = g;
      (user as any).genderOther = g === "other" && typeof genderOther === "string" && genderOther.trim() !== "" ? genderOther.trim() : null;
    } else if (Object.prototype.hasOwnProperty.call((req.body || {}), "genderOther")) {
      (user as any).genderOther = typeof genderOther === "string" && genderOther.trim() !== "" ? genderOther.trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call((req.body || {}), "dateOfBirth")) {
      if (dateOfBirth === null || dateOfBirth === "") {
        (user as any).dateOfBirth = null;
      } else {
        const d = new Date(dateOfBirth);
        if (Number.isNaN(d.getTime())) {
          res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. dateOfBirth must be a valid date." });
          return;
        }
        (user as any).dateOfBirth = d;
      }
    }

    if (typeof heardAboutUs === "string") {
      const h = heardAboutUs.trim().toLowerCase();
      if (!allowedHeard.includes(h as any)) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. heardAboutUs value is not allowed." });
        return;
      }
      (user as any).heardAboutUs = h;
      (user as any).heardAboutUsOther = h === "other" && typeof heardAboutUsOther === "string" && heardAboutUsOther.trim() !== "" ? heardAboutUsOther.trim() : null;
    } else if (Object.prototype.hasOwnProperty.call((req.body || {}), "heardAboutUsOther")) {
      (user as any).heardAboutUsOther = typeof heardAboutUsOther === "string" && heardAboutUsOther.trim() !== "" ? heardAboutUsOther.trim() : null;
    }

    await user.save();

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      teachableUserId: user.teachableUserId,
      gender: (user as any).gender,
      genderOther: (user as any).genderOther,
      dateOfBirth: (user as any).dateOfBirth,
      heardAboutUs: (user as any).heardAboutUs,
      heardAboutUsOther: (user as any).heardAboutUsOther,
      points: user.points,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      transactions: user.transactions,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };

    res.status(HttpStatusCode.Ok).send({ message: "User updated successfully.", user: safeUser });
    return;
  } catch (error) {
    console.error("Error updating user", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}
