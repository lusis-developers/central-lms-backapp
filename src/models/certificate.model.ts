import { Schema, model, type Document, Types } from "mongoose";

export interface ICertificate extends Document {
  userRef: Types.ObjectId;
  quizRef: Types.ObjectId;
  pdfUrl: string;
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
    pdfUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const CertificateModel = model<ICertificate>("certificates", certificateSchema);

export default CertificateModel;
