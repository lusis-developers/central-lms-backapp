import { Router } from "express";
import { confirmPayment } from "../controllers/payment.controller";

const paymentRouter = Router();

paymentRouter.post("/:userId/confirm", confirmPayment);

export default paymentRouter;

