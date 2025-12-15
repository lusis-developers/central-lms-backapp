import { Router } from "express";
import { createUser, loginUser, registerFromPayment, getUserById, checkUserByEmail, updateUser, changePassword } from "../controllers/user.controller";

const userRouter = Router();

userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/register-from-payment", registerFromPayment);
userRouter.get("/exists", checkUserByEmail);
userRouter.get("/:userId", getUserById);
userRouter.patch("/:userId", updateUser);
userRouter.patch("/:userId/password", changePassword);

export default userRouter;
