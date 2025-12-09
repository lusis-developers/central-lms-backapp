import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser, CourseAccess, CareerAccess, Payment } from "../types/user";

const CourseAccessSchema = new Schema<CourseAccess>(
  {
    teachableCourseId: { type: Number, required: true },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    enrolledAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, default: null },
    courseRef: { type: Schema.Types.ObjectId, ref: "courses", default: null },
  },
  { _id: false },
);

const CareerAccessSchema = new Schema<CareerAccess>(
  {
    careerId: { type: String, required: true },
    name: { type: String, required: true },
    courseIds: { type: [Number], default: [] },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    enrolledAt: { type: Date, default: () => new Date() },
    careerRef: { type: Schema.Types.ObjectId, ref: "careers", default: null },
  },
  { _id: false },
);

const PaymentSchema = new Schema<Payment>(
  {
    provider: { type: String, enum: ["teachable", "stripe", "other"], default: "teachable" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    transactionId: { type: String, required: true, index: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
    createdAt: { type: Date, default: () => new Date() },
    courseId: { type: Number },
    careerId: { type: String },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    teachableUserId: { type: Number },
    courses: { type: [CourseAccessSchema], default: [] },
    careers: { type: [CareerAccessSchema], default: [] },
    payments: { type: [PaymentSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

UserSchema.pre("save", async function (next) {
  const doc = this as any;
  if (doc.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(doc.password, salt);
  }
  next();
});

export const UserModel = model<IUser>("users", UserSchema);

