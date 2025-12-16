import { Schema, model, type Document, Types } from "mongoose";

export interface ICertificate extends Document {
  userRef: Types.ObjectId;
  quizRef: Types.ObjectId;
  filePath: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    userRef: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    quizRef: {
      type: Schema.Types.ObjectId,
      ref: "quizzes",
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index for auto-removal from DB
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const CertificateModel = model<ICertificate>("certificates", certificateSchema);

export default CertificateModel;
