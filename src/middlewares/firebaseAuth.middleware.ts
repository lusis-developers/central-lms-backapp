import type { Request, Response, NextFunction } from "express";
import admin from "../config/firebase";
import { HttpStatusCode } from "axios";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface FirebaseAuthRequest extends Request {
  user?: DecodedIdToken;
}

export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(HttpStatusCode.Unauthorized).send({ message: "No authorization header found." });
    return;
  }

  const idToken = header.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as FirebaseAuthRequest).user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    res.status(HttpStatusCode.Forbidden).send({ message: "Invalid or expired token." });
    return;
  }
};
