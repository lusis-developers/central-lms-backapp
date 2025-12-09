import teachable, { CreateUserBodyParam, ShowUserMetadataParam, EnrollUserBodyParam, ShowCourseMetadataParam, ShowCourseEnrollmentsMetadataParam, ShowLectureMetadataParam, MarkLectureCompleteBodyParam, MarkLectureCompleteMetadataParam, CourseProgressMetadataParam, ListQuizzesMetadataParam, ShowQuizMetadataParam, ShowQuizResponsesMetadataParam, ShowVideoMetadataParam, ListCoursesMetadataParam } from "@api/teachable";

class ServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class TeachableUsersService {
  private sdk = teachable;

  /**
   * Authenticate the Teachable SDK using TEACHABLE_API_KEY env var.
   * Throws ServiceError(400) if the API key is missing.
   */
  constructor() {
    const key = process.env.TEACHABLE_API_KEY?.trim();
    if (!key) {
      throw new ServiceError("Missing TEACHABLE_API_KEY env var", 400);
    }
    this.sdk.auth(key);
  }

  /**
   * Create a new user in Teachable.
   * Returns 201 with user details or 400 on validation error.
   */
  async createUser(body: CreateUserBodyParam): Promise<ReturnType<typeof teachable.createUser>> {
    return this.sdk.createUser(body);
  }

  /**
   * Fetch user details, enrollments and tags by user_id.
   * Returns 200 with user profile or 404 if not found.
   */
  async showUser(metadata: ShowUserMetadataParam): Promise<ReturnType<typeof teachable.showUser>> {
    return this.sdk.showUser(metadata);
  }

  /**
   * Enroll a user into a course using user_id and course_id.
   * Returns 204 on success, 404/422 on errors.
   */
  async enrollUser(body: EnrollUserBodyParam): Promise<ReturnType<typeof teachable.enrollUser>> {
    return this.sdk.enrollUser(body);
  }
}

export class TeachableCoursesService {
  private sdk = teachable;

  /**
   * Authenticate the Teachable SDK using TEACHABLE_API_KEY env var.
   * Throws ServiceError(400) if the API key is missing.
   */
  constructor() {
    const key = process.env.TEACHABLE_API_KEY?.trim();
    if (!key) {
      throw new ServiceError("Missing TEACHABLE_API_KEY env var", 400);
    }
    this.sdk.auth(key);
  }

  async listCourses(metadata?: ListCoursesMetadataParam): Promise<ReturnType<typeof teachable.listCourses>> {
    return this.sdk.listCourses(metadata as any);
  }

  /**
   * Fetch a course by course_id, including lecture_sections and author_bio.
   * Returns 200 with course details or 404 if not found.
   */
  async showCourse(metadata: ShowCourseMetadataParam): Promise<ReturnType<typeof teachable.showCourse>> {
    return this.sdk.showCourse(metadata);
  }

  /**
   * Fetch active enrollments and progress for a course.
   * Supports filters: enrolled_in_after, enrolled_in_before, sort_direction.
   */
  async showCourseEnrollments(metadata: ShowCourseEnrollmentsMetadataParam): Promise<ReturnType<typeof teachable.showCourseEnrollments>> {
    return this.sdk.showCourseEnrollments(metadata);
  }

  /**
   * Fetch lecture content by course_id and lecture_id.
   * Returns 200 with lecture details or 404 if not found.
   */
  async showLecture(metadata: ShowLectureMetadataParam): Promise<ReturnType<typeof teachable.showLecture>> {
    return this.sdk.showLecture(metadata);
  }

  /**
   * Mark a lecture as complete for a user.
   * Returns 204 on success, 404 if not found, 409 on conflict.
   */
  async markLectureComplete(body: MarkLectureCompleteBodyParam, metadata: MarkLectureCompleteMetadataParam): Promise<ReturnType<typeof teachable.markLectureComplete>> {
    return this.sdk.markLectureComplete(body, metadata);
  }

  /**
   * Fetch a user's course progress by course_id and user_id.
   * Supports pagination with page and per.
   */
  async courseProgress(metadata: CourseProgressMetadataParam): Promise<ReturnType<typeof teachable.courseProgress>> {
    return this.sdk.courseProgress(metadata);
  }

  /**
   * Fetch an id list of quizzes in a specific course lecture.
   * Returns 200 with quiz_ids or 404 if not found.
   */
  async listQuizzes(metadata: ListQuizzesMetadataParam): Promise<ReturnType<typeof teachable.listQuizzes>> {
    return this.sdk.listQuizzes(metadata);
  }

  /**
   * Fetch a specific quiz information by course_id, lecture_id and quiz_id.
   * Returns 200 with quiz attachment details or 404 if not found.
   */
  async showQuiz(metadata: ShowQuizMetadataParam): Promise<ReturnType<typeof teachable.showQuiz>> {
    return this.sdk.showQuiz(metadata);
  }

  /**
   * Fetch quiz responses by course_id, lecture_id and quiz_id.
   * Returns 200 with responses or 404 if not found.
   */
  async showQuizResponses(metadata: ShowQuizResponsesMetadataParam): Promise<ReturnType<typeof teachable.showQuizResponses>> {
    return this.sdk.showQuizResponses(metadata);
  }

  /**
   * Fetch a specific video information by course_id, lecture_id and video_id.
   * Returns 200 with video details or 404 if not found.
   */
  async showVideo(metadata: ShowVideoMetadataParam): Promise<ReturnType<typeof teachable.showVideo>> {
    return this.sdk.showVideo(metadata);
  }
}
