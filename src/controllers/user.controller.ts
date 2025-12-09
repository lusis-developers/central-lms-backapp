import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";

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
