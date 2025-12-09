import { Router } from "express";
import {
  createComment,
  replyToComment,
  likeComment,
  unlikeComment,
  getComments,
  getCommentById,
  getCommentReplies,
} from "../controllers/comments.controller";

const commentsRouter = Router();

commentsRouter.get("/", getComments);
commentsRouter.get("/:commentId", getCommentById);
commentsRouter.get("/:commentId/replies", getCommentReplies);
commentsRouter.post("/", createComment);
commentsRouter.post("/:commentId/replies", replyToComment);
commentsRouter.post("/:commentId/likes", likeComment);
commentsRouter.delete("/:commentId/likes/:userId", unlikeComment);

export default commentsRouter;

