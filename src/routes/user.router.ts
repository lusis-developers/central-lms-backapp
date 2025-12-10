import { Router } from "express";
import { createUser, loginUser, registerFromPayment, getUserById, checkUserByEmail } from "../controllers/user.controller";

const userRouter = Router();

userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/register-from-payment", registerFromPayment);
userRouter.get("/:userId", getUserById);
userRouter.get("/exists", checkUserByEmail);

export default userRouter;
