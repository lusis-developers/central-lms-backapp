import { Router } from "express";
import { createUser, loginUser, registerFromPayment, getUserById, checkUserByEmail, updateUser, changePassword, getUsers, grantManualAccess, requestPasswordRecovery, resetPassword, loginWithGoogle, deleteUser, upgradeAllToFounder } from "../controllers/user.controller";
import { verifyFirebaseToken } from "../middlewares/firebaseAuth.middleware";

const userRouter = Router();

userRouter.get("/", getUsers);
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/google-login", verifyFirebaseToken, loginWithGoogle);
userRouter.post("/register-from-payment", registerFromPayment);
userRouter.post("/manual-access", grantManualAccess);
userRouter.post("/request-password-recovery", requestPasswordRecovery);
userRouter.post("/reset-password", resetPassword);
userRouter.get("/exists", checkUserByEmail);
userRouter.get("/:userId", getUserById);
userRouter.patch("/:userId", updateUser);
userRouter.patch("/:userId/password", changePassword);
// Route to delete a single user and all related data (transactions, submissions, comments, certificates)
userRouter.delete("/:userId", deleteUser);

// Route to upgrade ALL users to founder
userRouter.post("/upgrade-all-founder", upgradeAllToFounder);

export default userRouter;
