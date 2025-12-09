import { Schema, model } from "mongoose";
import type { IComment } from "../types/comment";

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    content: { type: String, required: true },
    parent: { type: Schema.Types.ObjectId, ref: "comments", default: null, index: true },
    likes: { type: [Schema.Types.ObjectId], ref: "users", default: [] },
    courseId: { type: Number, default: null },
    lectureId: { type: Number, default: null },
    videoId: { type: Number, default: null },
  },
  { timestamps: true, versionKey: false },
);

CommentSchema.index({ parent: 1, createdAt: -1 });
CommentSchema.index({ courseId: 1, lectureId: 1, videoId: 1 });

export const CommentModel = model<IComment>("comments", CommentSchema);

