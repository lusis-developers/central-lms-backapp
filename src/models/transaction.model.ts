import { Schema, model } from "mongoose";
import type { ITransaction } from "../types/transaction";

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    provider: { type: String, enum: ["payphone"], default: "payphone" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "approved", "declined", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    transactionId: { type: String, required: true, index: true, unique: true },
    reference: { type: String },
    authorizationCode: { type: String },
    paymentMethod: { type: String, enum: ["card", "transfer", "cash", "payphone", "other"], default: "payphone" },
    phone: { type: String },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    courseId: { type: Number, default: null },
    careerId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

TransactionSchema.index({ user: 1, createdAt: -1 });

export const TransactionModel = model<ITransaction>("transactions", TransactionSchema);

