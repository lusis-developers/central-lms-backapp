import { Router } from "express";
import { createUser, loginUser, registerFromPayment, getUserById } from "../controllers/user.controller";

const userRouter = Router();

userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/register-from-payment", registerFromPayment);
userRouter.get("/:userId", getUserById);

export default userRouter;
