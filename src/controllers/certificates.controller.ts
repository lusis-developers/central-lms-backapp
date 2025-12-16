import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import fs from "fs";
import { models } from "../models";
import type { IQuiz, IQuizSubmission } from "../types/quiz";
import { certificateService } from "../services/certificate.service";
import { TeachableCoursesService } from "../services/teachable";

export async function generateCertificateController(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { quizId } = req.params as { quizId: string };
    const { userId } = (req.body || {}) as { userId?: string };

    if (!quizId || !Types.ObjectId.isValid(quizId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid quizId is required." });
      return;
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid userId is required." });
      return;
    }

    const userObjId = new Types.ObjectId(userId);
    const quizObjId = new Types.ObjectId(quizId);

    const submission = await models.quizSubmissions.findOne({ userRef: userObjId, quizRef: quizObjId }).lean<IQuizSubmission | null>();

    if (!submission || !submission.passed) {
      res.status(HttpStatusCode.Forbidden).send({ message: "Certificate cannot be generated. Quiz not passed." });
      return;
    }

    const quiz = await models.quizzes.findById(quizId).lean<IQuiz>();
    if (!quiz) {
         res.status(HttpStatusCode.NotFound).send({ message: "Quiz not found." });
         return;
    }

    let certificate = await models.certificates.findOne({ userRef: userObjId, quizRef: quizObjId }).lean();
    if (certificate) {
        if (new Date() > certificate.expiresAt || !fs.existsSync(certificate.filePath)) {
             if (fs.existsSync(certificate.filePath)) {
                certificateService.deleteCertificateFile(certificate.filePath);
             }
             await models.certificates.deleteOne({ _id: certificate._id });
             certificate = null;
        } else {
             const downloadUrl = `/courses/${quiz.teachableCourseId}/certificate?userId=${userId}`;
             res.status(HttpStatusCode.Ok).send({ 
                message: "Certificate already available.", 
                certificateId: certificate._id, 
                expiresAt: certificate.expiresAt,
                downloadUrl
             });
             return;
        }
    }

    const user = await models.users.findById(userId).lean();
    if (!user) {
        res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
        return;
    }

    await createAndSendCertificate(user, quiz, submission, res);
    return;

  } catch (error) {
    console.error("Error generating certificate", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function generateCertificateByCourseController(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params as { courseId: string };
    const { userId } = (req.body || {}) as { userId?: string };

    if (!courseId || isNaN(Number(courseId))) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid userId is required." });
      return;
    }

    const userObjId = new Types.ObjectId(userId);
    const quizzes = await models.quizzes.find({ teachableCourseId: Number(courseId) }).lean<IQuiz[]>();

    if (!quizzes || quizzes.length === 0) {
      res.status(HttpStatusCode.NotFound).send({ message: "No quizzes found for this course." });
      return;
    }

    const quizIds = quizzes.map((q) => q._id);
    const submission = await models.quizSubmissions.findOne({
      userRef: userObjId,
      quizRef: { $in: quizIds },
      passed: true
    }).sort({ createdAt: -1 }).lean<IQuizSubmission | null>();

    if (!submission) {
      res.status(HttpStatusCode.Forbidden).send({ message: "Certificate cannot be generated. No passed quiz found for this course." });
      return;
    }

    const quiz = quizzes.find((q) => q._id.toString() === submission.quizRef.toString());
    if (!quiz) {
       // Should not happen given the query logic
       res.status(HttpStatusCode.NotFound).send({ message: "Quiz not found." });
       return;
    }

    // Check existing certificate
    let certificate = await models.certificates.findOne({ userRef: userObjId, quizRef: quiz._id }).lean();
    if (certificate) {
        // If expired OR file missing, delete and regenerate
        if (new Date() > certificate.expiresAt || !fs.existsSync(certificate.filePath)) {
             if (fs.existsSync(certificate.filePath)) {
                certificateService.deleteCertificateFile(certificate.filePath);
             }
             await models.certificates.deleteOne({ _id: certificate._id });
             certificate = null;
        } else {
             const downloadUrl = `/courses/${quiz.teachableCourseId}/certificate?userId=${userId}`;
             res.status(HttpStatusCode.Ok).send({ 
                 message: "Certificate already available.", 
                 certificateId: certificate._id, 
                 expiresAt: certificate.expiresAt,
                 downloadUrl
             });
             return;
        }
    }

    const user = await models.users.findById(userId).lean();
    if (!user) {
        res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
        return;
    }

    await createAndSendCertificate(user, quiz, submission, res);
    return;

  } catch (error) {
    console.error("Error generating certificate by course", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

export async function downloadCertificateByCourseController(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params as { courseId: string };
    const { userId } = (req.query || {}) as { userId?: string };

    if (!courseId || isNaN(Number(courseId))) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const userObjId = new Types.ObjectId(userId);
    const quizzes = await models.quizzes.find({ teachableCourseId: Number(courseId) }).lean<IQuiz[]>();

    if (!quizzes || quizzes.length === 0) {
      res.status(HttpStatusCode.NotFound).send({ message: "No quizzes found for this course." });
      return;
    }

    const quizIds = quizzes.map((q) => q._id);
    
    // Find any valid certificate for this user and these quizzes, preferring the most recent
    const certificate = await models.certificates.findOne({ 
        userRef: userObjId, 
        quizRef: { $in: quizIds } 
    }).sort({ createdAt: -1 }).lean();

    if (!certificate) {
        res.status(HttpStatusCode.NotFound).send({ message: "Certificate not found." });
        return;
    }

    if (new Date() > certificate.expiresAt) {
         certificateService.deleteCertificateFile(certificate.filePath);
         await models.certificates.deleteOne({ _id: certificate._id });
         res.status(HttpStatusCode.Gone).send({ message: "Certificate expired." });
         return;
    }

    if (fs.existsSync(certificate.filePath)) {
        res.download(certificate.filePath, `certificate-${courseId}.pdf`);
        return;
    } else {
        // Clean up invalid record so it can be regenerated
        await models.certificates.deleteOne({ _id: certificate._id });
        res.status(HttpStatusCode.NotFound).send({ message: "Certificate file not found on server. Please regenerate." });
        return;
    }

  } catch (error) {
    console.error("Error downloading certificate by course", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

async function createAndSendCertificate(user: any, quiz: IQuiz, submission: IQuizSubmission, res: Response) {
    let courseName = `Course ${quiz.teachableCourseId}`;
    try {
        const teachableService = new TeachableCoursesService();
        const courseRes = await teachableService.showCourse({ course_id: Number(quiz.teachableCourseId) });
        if (courseRes.status === 200 && courseRes.data?.course?.name) {
            courseName = courseRes.data.course.name;
        }
    } catch (err) {
        console.error("Error fetching course name from Teachable", err);
    }

    const certId = new Types.ObjectId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const filePath = await certificateService.generateCertificate(
        user.name || "Student",
        courseName,
        submission.updatedAt || new Date(),
        certId.toString()
    );

    if (!fs.existsSync(filePath)) {
        throw new Error(`Failed to generate certificate file at ${filePath}`);
    }

    const newCert = await models.certificates.create({
        _id: certId,
        userRef: user._id,
        quizRef: quiz._id,
        filePath,
        expiresAt
    });

    const downloadUrl = `/courses/${quiz.teachableCourseId}/certificate?userId=${user._id}`;
    res.status(HttpStatusCode.Created).send({ 
        message: "Certificate generated successfully.", 
        certificateId: newCert._id, 
        expiresAt: newCert.expiresAt,
        downloadUrl
    });
}

export async function downloadCertificateController(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
     const { quizId } = req.params as { quizId: string };
     const { userId } = (req.query || {}) as { userId?: string };

     if (!quizId || !Types.ObjectId.isValid(quizId)) {
       res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid quizId is required." });
       return;
     }
     if (!userId || !Types.ObjectId.isValid(userId)) {
       res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
       return;
     }

     const userObjId = new Types.ObjectId(userId);
     const quizObjId = new Types.ObjectId(quizId);

     const certificate = await models.certificates.findOne({ userRef: userObjId, quizRef: quizObjId }).lean();
     
     if (!certificate) {
         res.status(HttpStatusCode.NotFound).send({ message: "Certificate not found. Please generate it first." });
         return;
     }

     if (new Date() > certificate.expiresAt) {
          res.status(HttpStatusCode.Gone).send({ message: "Certificate expired. Please generate a new one." });
          return;
     }

     if (!fs.existsSync(certificate.filePath)) {
          // Clean up invalid record so it can be regenerated
          await models.certificates.deleteOne({ _id: certificate._id });
          res.status(HttpStatusCode.NotFound).send({ message: "Certificate file not found on server. Please regenerate." });
          return;
     }

     res.download(certificate.filePath);
     return;
  } catch (error) {
    console.error("Error downloading certificate", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}
