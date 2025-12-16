import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TeachableUsersService } from "../services/teachable";
import { EmailService } from "../services/email.service";
import type { IUser, CourseAccess } from "../types/user";
import type { CreateUserBodyParam, EnrollUserBodyParam } from "@api/teachable/types";

type CreateUserRequestBody = {
  name?: string;
  email?: string;
  password?: string;
  courseId?: string | number | null;
};

type TeachableCreateUserResponse = {
  data?: { id?: number; user?: { id?: number } };
};

function extractTeachableUserId(resp: unknown): number | undefined {
  const r = resp as TeachableCreateUserResponse | undefined;
  const id = r?.data?.id ?? r?.data?.user?.id;
  return typeof id === "number" ? id : undefined;
}

export async function createUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password, courseId } = (req.body || {}) as CreateUserRequestBody;

    if (!name || !email || !password) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Name, email and password are required." });
      return;
    }

    const existing = await models.users.findOne({ email }).lean<IUser>();
    if (existing) {
      res.status(HttpStatusCode.Conflict).send({ message: "User already exists." });
      return;
    }

    const user = await models.users.create({ name, email, password });

    const teachableService = new TeachableUsersService();
    const createBody: CreateUserBodyParam = { name, email, password };
    const teachableRes = await teachableService.createUser(createBody);
    const teachableUserId = extractTeachableUserId(teachableRes);

    if (typeof teachableUserId === "number") {
      user.teachableUserId = teachableUserId;
      await user.save();

      const requestedCourseId = courseId;
      const defaultCourseId = process.env.TEACHABLE_DEFAULT_COURSE_ID;
      const courseIdValue = requestedCourseId ?? defaultCourseId;

      if (courseIdValue !== undefined && courseIdValue !== null && String(courseIdValue).trim() !== "") {
        const courseIdNumber = Number(courseIdValue);
        if (!Number.isNaN(courseIdNumber) && courseIdNumber > 0) {
          const enrollBody: EnrollUserBodyParam = { user_id: teachableUserId, course_id: courseIdNumber };
          await teachableService.enrollUser(enrollBody);
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
      gender: user.gender,
      genderOther: user.genderOther,
      dateOfBirth: user.dateOfBirth,
      heardAboutUs: user.heardAboutUs,
      heardAboutUsOther: user.heardAboutUsOther,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(HttpStatusCode.Created).send({ message: "User created successfully.", user: safeUser });
    return;
  } catch (error) {
    console.error("Error creating user", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function getUsers(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { page = 1, limit = 10, search } = req.query as { page?: string; limit?: string; search?: string };
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      models.users
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean<IUser[]>(),
      models.users.countDocuments(query),
    ]);

    const usersWithStats = users.map((user) => {
      const approvedCourses = user.courses.filter((c) => c.completedAt).length;
      const approvedCareers = user.careers.filter((c) => c.completedAt).length;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        teachableUserId: user.teachableUserId,
        points: user.points,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        courses: user.courses,
        careers: user.careers,
        approvedCoursesCount: approvedCourses,
        approvedCareersCount: approvedCareers,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    res.status(HttpStatusCode.Ok).send({
      message: "Users retrieved successfully.",
      data: usersWithStats,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
    return;
  } catch (error) {
    console.error("Error fetching users", error);
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
    const { userId } = req.params as { userId: string };

    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const user = await models.users.findById(userId).lean<IUser>();
    if (!user) {
      res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
      return;
    }

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      teachableUserId: user.teachableUserId,
      gender: user.gender,
      genderOther: user.genderOther,
      dateOfBirth: user.dateOfBirth,
      heardAboutUs: user.heardAboutUs,
      heardAboutUsOther: user.heardAboutUsOther,
      points: user.points,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      transactions: user.transactions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
    const q = (req.query || {}) as Record<string, unknown>;
    const emailParam = q.email;
    const value = Array.isArray(emailParam)
      ? (emailParam[0] ?? "").trim()
      : typeof emailParam === "string"
        ? emailParam.trim()
        : "";
    if (!value) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid email is required." });
      return;
    }

    const user = await models.users.findOne({ email: value }).lean<IUser>();
    if (!user) {
      res.status(HttpStatusCode.Ok).send({ message: "User not found.", exists: false });
      return;
    }

    const safeUser = {
      _id: user._id,
      email: user.email,
      teachableUserId: user.teachableUserId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
    const { email, password } = (req.body || {}) as { email?: string; password?: string };

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
      gender: user.gender,
      genderOther: user.genderOther,
      dateOfBirth: user.dateOfBirth,
      heardAboutUs: user.heardAboutUs,
      heardAboutUsOther: user.heardAboutUsOther,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
    const payload = (req.body || {}) as {
      email?: string;
      transactionStatus?: string;
      statusCode?: number;
      authorizationCode?: string;
      transactionId?: string | number;
      amount?: number | string;
      currency?: string;
      reference?: string;
      courseIds?: Array<number | string> | null;
    };
    const email: string | undefined = payload.email;
    const transactionStatus: string | undefined = payload.transactionStatus;
    const statusCode: number | undefined = payload.statusCode;
    const authorizationCode: string | undefined = payload.authorizationCode;
    const transactionId: string | number | undefined = payload.transactionId;
    const amountVal = payload.amount;
    const amount: number | undefined = typeof amountVal === "string" ? Number(amountVal) : amountVal;
    const currency: string | undefined = payload.currency;
    const reference: string | undefined = payload.reference;

    if (!email || typeof email !== "string") {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Email is required." });
      return;
    }

    if (!(transactionStatus === "Approved" || statusCode === 3)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Transaction must be approved." });
      return;
    }

    const existing = await models.users.findOne({ email }).lean<IUser>();
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
  const createBody: CreateUserBodyParam = { name, email, password };
  const teachableRes = await teachableService.createUser(createBody);
  const teachableUserId = extractTeachableUserId(teachableRes);

  if (typeof teachableUserId === "number") {
    user.teachableUserId = teachableUserId;
    await user.save();

    const bodyCourseIds = Array.isArray(payload.courseIds) ? payload.courseIds : undefined;
    const envCourseIdsRaw = process.env.TEACHABLE_DEFAULT_COURSE_IDS;
    const envSingle = process.env.TEACHABLE_DEFAULT_COURSE_ID;

    let courseIds: number[] = [];
    if (bodyCourseIds) {
      courseIds = bodyCourseIds
        .map((v) => Number(v))
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
        const body: EnrollUserBodyParam = { user_id: teachableUserId, course_id: cid };
        await teachableService.enrollUser(body);
        enrolledRemotely = true;
      } catch (err) {
        const status = (err as { status?: number }).status ?? (err as { response?: { status?: number } }).response?.status;
        const rawMsg = (err as { data?: { message?: string }; message?: string }).data?.message ?? (err as { message?: string }).message ?? "";
        const msg = typeof rawMsg === "string" ? rawMsg.toLowerCase() : "";
        if (status === 422 || msg.includes("already enrolled")) {
          enrolledRemotely = true;
        } else {
          console.error("Teachable enroll error", { courseId: cid, error: err });
        }
      }
      const exists = (user.courses || []).some((c: CourseAccess) => Number(c.teachableCourseId) === Number(cid));
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
      gender: user.gender,
      genderOther: user.genderOther,
      dateOfBirth: user.dateOfBirth,
      heardAboutUs: user.heardAboutUs,
      heardAboutUsOther: user.heardAboutUsOther,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
    const { userId } = req.params as { userId: string };
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

    const { name, email, gender, genderOther, dateOfBirth, heardAboutUs, heardAboutUsOther } = (req.body || {}) as {
      name?: string;
      email?: string;
      gender?: string;
      genderOther?: string | null;
      dateOfBirth?: string | Date | null;
      heardAboutUs?: string;
      heardAboutUsOther?: string | null;
    };

    const user = await models.users.findById(userId);
    if (!user) {
      res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
      return;
    }

    if (typeof name === "string" && name.trim() !== "") {
      user.name = name.trim();
    }

    if (typeof email === "string" && email.trim() !== "" && email.trim() !== user.email) {
      const conflict = await models.users.findOne({ email: email.trim(), _id: { $ne: user._id } }).lean<IUser>();
      if (conflict) {
        res.status(HttpStatusCode.Conflict).send({ message: "Email already in use." });
        return;
      }
      user.email = email.trim();
    }

    if (typeof gender === "string") {
      const g = gender.trim().toLowerCase();
      if (!allowedGenders.includes(g as typeof allowedGenders[number])) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Gender value is not allowed." });
        return;
      }
      user.gender = g as typeof allowedGenders[number];
      user.genderOther = g === "other" && typeof genderOther === "string" && genderOther.trim() !== "" ? genderOther.trim() : null;
    } else if (Object.prototype.hasOwnProperty.call((req.body || {}), "genderOther")) {
      user.genderOther = typeof genderOther === "string" && genderOther.trim() !== "" ? genderOther.trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call((req.body || {}), "dateOfBirth")) {
      if (dateOfBirth === null || dateOfBirth === "") {
        user.dateOfBirth = null;
      } else {
        const d = new Date(dateOfBirth as string | number | Date);
        if (Number.isNaN(d.getTime())) {
          res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. dateOfBirth must be a valid date." });
          return;
        }
        user.dateOfBirth = d;
      }
    }

    if (typeof heardAboutUs === "string") {
      const h = heardAboutUs.trim().toLowerCase();
      if (!allowedHeard.includes(h as typeof allowedHeard[number])) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. heardAboutUs value is not allowed." });
        return;
      }
      user.heardAboutUs = h as typeof allowedHeard[number];
      user.heardAboutUsOther = h === "other" && typeof heardAboutUsOther === "string" && heardAboutUsOther.trim() !== "" ? heardAboutUsOther.trim() : null;
    } else if (Object.prototype.hasOwnProperty.call((req.body || {}), "heardAboutUsOther")) {
      user.heardAboutUsOther = typeof heardAboutUsOther === "string" && heardAboutUsOther.trim() !== "" ? heardAboutUsOther.trim() : null;
    }

    await user.save();

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      teachableUserId: user.teachableUserId,
      gender: user.gender,
      genderOther: user.genderOther,
      dateOfBirth: user.dateOfBirth,
      heardAboutUs: user.heardAboutUs,
      heardAboutUsOther: user.heardAboutUsOther,
      points: user.points,
      courses: user.courses,
      careers: user.careers,
      payments: user.payments,
      transactions: user.transactions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(HttpStatusCode.Ok).send({ message: "User updated successfully.", user: safeUser });
    return;
  } catch (error) {
    console.error("Error updating user", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params as { userId: string };
    const { currentPassword, newPassword } = (req.body || {}) as { currentPassword?: string; newPassword?: string };

    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. currentPassword and newPassword are required." });
      return;
    }

    if (newPassword.length < 8) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. newPassword must be at least 8 characters." });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. New password must be different from current password." });
      return;
    }

    const user = await models.users.findById(userId);
    if (!user) {
      res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
      return;
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      res.status(HttpStatusCode.Unauthorized).send({ message: "Invalid credentials." });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.status(HttpStatusCode.Ok).send({ message: "Password updated successfully." });
    return;
  } catch (error) {
    console.error("Error changing password", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}
