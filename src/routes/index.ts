import express, { Application } from "express";
import userRouter from "./user.router";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);
  router.use("/users", userRouter);
}

export default routerApi;
