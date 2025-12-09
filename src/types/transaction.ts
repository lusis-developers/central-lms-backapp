import type { Types } from "mongoose";

export type TransactionStatus =
  | "pending"
  | "approved"
  | "declined"
  | "failed"
  | "refunded";

export interface ITransaction {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  provider: "payphone";
  amount: number;
  currency: string;
  status: TransactionStatus;
  transactionId: string;
  reference?: string;
  authorizationCode?: string;
  paymentMethod?: "card" | "transfer" | "cash" | "payphone" | "other";
  phone?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
  courseId?: number | null;
  careerId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

