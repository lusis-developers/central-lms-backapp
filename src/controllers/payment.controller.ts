import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { PaymentService } from "../services/payment.service";

export async function confirmPayment(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id, clientTransactionId } = req.body;

    // Basic validation
    if (!id || !clientTransactionId) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Missing transaction data (id, clientTransactionId).",
      });
      return;
    }

    const service = new PaymentService();
    const result = await service.confirmAndProcess(
      String(id),
      String(clientTransactionId),
    );

    res.status(HttpStatusCode.Ok).send({
      message: "Payment confirmed and processed successfully.",
      user: result.user,
    });
    return;
  } catch (error: any) {
    console.error("Error in payment confirmation:", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({
      message: error?.message || "Error processing payment.",
    });
    return;
  }
}
