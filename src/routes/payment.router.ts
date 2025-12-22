import { Router } from "express";
import { confirmPayment } from "../controllers/payment.controller";

const paymentRouter = Router();

// Confirm PayPhone payment transaction
paymentRouter.post("/:userId/confirm", confirmPayment);

export default paymentRouter;

