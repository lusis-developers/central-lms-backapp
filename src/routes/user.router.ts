import { Router } from "express";
import { createUser, loginUser, registerFromPayment } from "../controllers/user.controller";

const userRouter = Router();

userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/register-from-payment", registerFromPayment);

export default userRouter;
