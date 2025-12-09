import { Types } from "mongoose";
import { models } from "../models";

export class PointsService {
  async awardCommentPoint(userId: string): Promise<void> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      const error: any = new Error("Invalid payload. A valid userId is required.");
      error.status = 400;
      throw error;
    }

    await models.users.updateOne({ _id: userId }, { $inc: { points: 1 } });
  }
}

