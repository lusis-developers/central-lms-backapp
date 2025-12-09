import type { Types } from "mongoose";

export interface CourseAccess {
  teachableCourseId: number;
  status: "active" | "revoked";
  enrolledAt: Date;
  expiresAt?: Date | null;
  courseRef?: Types.ObjectId | null;
}

export interface CareerAccess {
  careerId: string;
  name: string;
  courseIds: number[];
  status: "active" | "revoked";
  enrolledAt: Date;
  careerRef?: Types.ObjectId | null;
}

export interface Payment {
  provider: "teachable" | "stripe" | "other";
  amount: number;
  currency: string;
  transactionId: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  courseId?: number;
  careerId?: string;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  teachableUserId?: number;
  points?: number;
  courses: CourseAccess[];
  careers: CareerAccess[];
  payments: Payment[];
  transactions?: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}
