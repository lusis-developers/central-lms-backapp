import { Router } from "express";
import { createUser, loginUser, registerFromPayment, getUserById, checkUserByEmail, updateUser, changePassword, getUsers, grantManualAccess, requestPasswordRecovery, resetPassword } from "../controllers/user.controller";

const userRouter = Router();

userRouter.get("/", getUsers);
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/register-from-payment", registerFromPayment);
userRouter.post("/manual-access", grantManualAccess);
userRouter.post("/request-password-recovery", requestPasswordRecovery);
userRouter.post("/reset-password", resetPassword);
userRouter.get("/exists", checkUserByEmail);
userRouter.get("/:userId", getUserById);
userRouter.patch("/:userId", updateUser);
userRouter.patch("/:userId/password", changePassword);

export default userRouter;
