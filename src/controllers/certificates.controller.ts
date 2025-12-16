import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import { models } from "../models";
import type { IQuiz, IQuizSubmission } from "../types/quiz";
import { certificateService } from "../services/certificate.service";
import { TeachableCoursesService } from "../services/teachable";

/**
 * Generates a certificate for a specific course if the user has passed the required quiz.
 * If a certificate already exists (and is valid), it returns the existing one.
 */
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
    
    // Find quizzes associated with this Teachable course
    const quizzes = await models.quizzes.find({ teachableCourseId: Number(courseId) }).lean<IQuiz[]>();

    if (!quizzes || quizzes.length === 0) {
      res.status(HttpStatusCode.NotFound).send({ message: "No quizzes found for this course." });
      return;
    }

    const quizIds = quizzes.map((q) => q._id);
    
    // Check if user has passed any quiz for this course (preferring the most recent passed submission)
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
       res.status(HttpStatusCode.NotFound).send({ message: "Quiz not found." });
       return;
    }

    // Check existing certificate
    let certificate = await models.certificates.findOne({ userRef: userObjId, quizRef: quiz._id }).lean();
    
    // Legacy/Format check: If certificate exists but has no pdfUrl OR it is a PDF (we want JPG now), delete it to regenerate
    if (certificate && (!certificate.pdfUrl || certificate.pdfUrl.endsWith(".pdf"))) {
        await models.certificates.deleteOne({ _id: certificate._id });
        certificate = null;
    }

    if (certificate) {
         res.status(HttpStatusCode.Ok).send({ 
             message: "Certificate already available.", 
             certificateId: certificate._id, 
             pdfUrl: certificate.pdfUrl
         });
         return;
    }

    const user = await models.users.findById(userId).lean();
    if (!user) {
        res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
        return;
    }

    // Generate and save new certificate
    await createAndSendCertificate(user, quiz, submission, res);
    return;

  } catch (error) {
    console.error("Error generating certificate by course", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

/**
 * Retrieves all certificates for a specific user.
 * Populates quiz details to display course info.
 */
export async function getAllCertificatesController(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params as { userId: string };

    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const userObjId = new Types.ObjectId(userId);
    const certificates = await models.certificates.find({ userRef: userObjId })
      .populate("quizRef")
      .sort({ createdAt: -1 })
      .lean();

    res.status(HttpStatusCode.Ok).send({
      message: "Certificates retrieved successfully.",
      certificates
    });
    return;
  } catch (error) {
    console.error("Error fetching certificates", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

/**
 * Checks the certificate status for a specific course and user.
 * Returns { passed: boolean, certificate: object | null }
 * Used to show "Approved" status or "Generate Certificate" button in the course view.
 */
export async function getCertificateByCourseController(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { courseId } = req.params as { courseId: string };
    const { userId } = req.query as { userId?: string };

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

    // If no quizzes exist, user cannot have passed or have a certificate
    if (!quizzes || quizzes.length === 0) {
      res.status(HttpStatusCode.Ok).send({
          message: "No quizzes found for this course.",
          passed: false,
          certificate: null
      });
      return;
    }

    const quizIds = quizzes.map((q) => q._id);
    
    // Check if user has passed any quiz for this course
    const submission = await models.quizSubmissions.findOne({
      userRef: userObjId,
      quizRef: { $in: quizIds },
      passed: true
    }).sort({ createdAt: -1 }).lean<IQuizSubmission | null>();

    const passed = !!submission;

    // Find existing certificate
    const certificate = await models.certificates.findOne({ 
        userRef: userObjId, 
        quizRef: { $in: quizIds } 
    }).sort({ createdAt: -1 }).populate("quizRef").lean();

    res.status(HttpStatusCode.Ok).send({
      message: "Certificate status retrieved successfully.",
      passed,
      certificate: certificate || null
    });
    return;

  } catch (error) {
    console.error("Error fetching certificate by course", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Internal server error." });
    return;
  }
}

// Helper function to generate PDF, upload to Cloudinary (as JPG), and save to DB
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
    
    // Generate certificate and upload as JPG
    const pdfUrl = await certificateService.generateCertificate(
        user.name || "Student",
        courseName,
        submission.updatedAt || new Date(),
        certId.toString()
    );

    const newCert = await models.certificates.create({
        _id: certId,
        userRef: user._id,
        quizRef: quiz._id,
        pdfUrl
    });

    res.status(HttpStatusCode.Created).send({ 
        message: "Certificate generated successfully.", 
        certificateId: newCert._id, 
        pdfUrl: newCert.pdfUrl
    });
}

