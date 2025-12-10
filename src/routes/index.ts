import express, { Application } from "express";
import userRouter from "./user.router";
import coursesRouter from "./courses.router";
import commentsRouter from "./comments.router";
import gamificationRouter from "./gamification.router";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);
  router.use("/users", userRouter);
  router.use("/courses", coursesRouter);
  router.use("/comments", commentsRouter);
  router.use("/gamification", gamificationRouter);
}

export default routerApi;
