import type { Types } from "mongoose";

export interface IComment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  parent?: Types.ObjectId | null;
  likes: Types.ObjectId[];
  courseId?: number | null;
  lectureId?: number | null;
  videoId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

