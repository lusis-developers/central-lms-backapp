import { Router } from "express";
import {
  generateCertificateByCourseController,
  getAllCertificatesController,
  getCertificateByCourseController,
  verifyCertificateController,
} from "../controllers/certificates.controller";

const certificatesRouter = Router({ mergeParams: true });

// 1. Get all certificates for a user (for the "My Certificates" view)
certificatesRouter.get("/user/:userId", getAllCertificatesController);

// 2. Verify a certificate (Public access possible)
certificatesRouter.get("/verify/:certificateId", verifyCertificateController);

// 3. Get certificate status/details for a course (for the "Course View" - Approved status)
certificatesRouter.get("/:courseId/status", getCertificateByCourseController);

// 3. Generate Certificate by Course (auto-detect quiz) - User clicks "Generate" after approval
certificatesRouter.post("/:courseId/certificate", generateCertificateByCourseController);

export default certificatesRouter;
