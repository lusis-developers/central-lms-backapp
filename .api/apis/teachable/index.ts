import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'teachable/0.0.1 (api/6.1.3)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * Fetch all courses at your school.
   *
   */
  listCourses(metadata?: types.ListCoursesMetadataParam): Promise<FetchResponse<200, types.ListCoursesResponse200>> {
    return this.core.fetch('/v1/courses', 'get', metadata);
  }

  /**
   * Fetch a specific course by ID.
   *
   * @throws FetchError<404, types.ShowCourseResponse404> 404 response
   */
  showCourse(metadata: types.ShowCourseMetadataParam): Promise<FetchResponse<200, types.ShowCourseResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}', 'get', metadata);
  }

  /**
   * Fetch active enrolled students and student progress for a specific course.
   *
   * @throws FetchError<404, types.ShowCourseEnrollmentsResponse404> 404 response
   */
  showCourseEnrollments(metadata: types.ShowCourseEnrollmentsMetadataParam): Promise<FetchResponse<200, types.ShowCourseEnrollmentsResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}/enrollments', 'get', metadata);
  }

  /**
   * Fetch content of a specific course lecture.
   *
   * @throws FetchError<404, types.ShowLectureResponse404> 404 response
   */
  showLecture(metadata: types.ShowLectureMetadataParam): Promise<FetchResponse<200, types.ShowLectureResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}/lectures/{lecture_id}', 'get', metadata);
  }

  /**
   * Mark a specific course lecture as complete.
   *
   * @throws FetchError<404, types.MarkLectureCompleteResponse404> 404 response
   * @throws FetchError<409, types.MarkLectureCompleteResponse409> 409 response
   */
  markLectureComplete(body: types.MarkLectureCompleteBodyParam, metadata: types.MarkLectureCompleteMetadataParam): Promise<FetchResponse<204, types.MarkLectureCompleteResponse204>> {
    return this.core.fetch('/v1/courses/{course_id}/lectures/{lecture_id}/mark_complete', 'post', body, metadata);
  }

  /**
   * Fetch a specific user's course progress.
   *
   * @throws FetchError<404, types.CourseProgressResponse404> 404 response
   */
  courseProgress(metadata: types.CourseProgressMetadataParam): Promise<FetchResponse<200, types.CourseProgressResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}/progress', 'get', metadata);
  }

  /**
   * Fetch an id list of quizzes in a specific course lecture.
   *
   * @throws FetchError<404, types.ListQuizzesResponse404> 404 response
   */
  listQuizzes(metadata: types.ListQuizzesMetadataParam): Promise<FetchResponse<200, types.ListQuizzesResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}/lectures/{lecture_id}/quizzes', 'get', metadata);
  }

  /**
   * Fetch a specific quiz information.
   *
   * @throws FetchError<404, types.ShowQuizResponse404> 404 response
   */
  showQuiz(metadata: types.ShowQuizMetadataParam): Promise<FetchResponse<200, types.ShowQuizResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}/lectures/{lecture_id}/quizzes/{quiz_id}', 'get', metadata);
  }

  /**
   * Fetch the responses of quiz.
   *
   * @throws FetchError<404, types.ShowQuizResponsesResponse404> 404 response
   */
  showQuizResponses(metadata: types.ShowQuizResponsesMetadataParam): Promise<FetchResponse<200, types.ShowQuizResponsesResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}/lectures/{lecture_id}/quizzes/{quiz_id}/responses', 'get', metadata);
  }

  /**
   * Fetch a specific video information.
   *
   * @throws FetchError<404, types.ShowVideoResponse404> 404 response
   */
  showVideo(metadata: types.ShowVideoMetadataParam): Promise<FetchResponse<200, types.ShowVideoResponse200>> {
    return this.core.fetch('/v1/courses/{course_id}/lectures/{lecture_id}/videos/{video_id}', 'get', metadata);
  }

  /**
   * Create a new user
   *
   * @throws FetchError<400, types.CreateUserResponse400> 400 response
   */
  createUser(body: types.CreateUserBodyParam): Promise<FetchResponse<201, types.CreateUserResponse201>> {
    return this.core.fetch('/v1/users', 'post', body);
  }

  /**
   * Get a list of users
   *
   */
  listUsers(metadata?: types.ListUsersMetadataParam): Promise<FetchResponse<200, types.ListUsersResponse200>> {
    return this.core.fetch('/v1/users', 'get', metadata);
  }

  /**
   * List a specific user and their course enrollments by user ID.
   *
   * @throws FetchError<404, types.ShowUserResponse404> 404 response
   */
  showUser(metadata: types.ShowUserMetadataParam): Promise<FetchResponse<200, types.ShowUserResponse200>> {
    return this.core.fetch('/v1/users/{user_id}', 'get', metadata);
  }

  /**
   * Update the name or src of a user.
   *
   * @throws FetchError<404, types.UpdateUserResponse404> 404 response
   */
  updateUser(body: types.UpdateUserBodyParam, metadata: types.UpdateUserMetadataParam): Promise<FetchResponse<200, types.UpdateUserResponse200>> {
    return this.core.fetch('/v1/users/{user_id}', 'patch', body, metadata);
  }

  /**
   * Enroll a user in a course.
   *
   * @throws FetchError<404, types.EnrollUserResponse404> 404 response
   * @throws FetchError<422, types.EnrollUserResponse422> 422 response
   */
  enrollUser(body: types.EnrollUserBodyParam): Promise<FetchResponse<204, types.EnrollUserResponse204>> {
    return this.core.fetch('/v1/enroll', 'post', body);
  }

  /**
   * Unenroll a user from a course.
   *
   * @throws FetchError<404, types.UnenrollUserResponse404> 404 response
   */
  unenrollUser(body: types.UnenrollUserBodyParam): Promise<FetchResponse<204, types.UnenrollUserResponse204>> {
    return this.core.fetch('/v1/unenroll', 'post', body);
  }

  /**
   * Fetch all webhook events for your school.
   *
   */
  listWebhooks(): Promise<FetchResponse<200, types.ListWebhooksResponse200>> {
    return this.core.fetch('/v1/webhooks', 'get');
  }

  /**
   * Fetch all the events for a webhook.
   *
   */
  showWebhookEvents(metadata: types.ShowWebhookEventsMetadataParam): Promise<FetchResponse<200, types.ShowWebhookEventsResponse200>> {
    return this.core.fetch('/v1/webhooks/{webhook_id}/events', 'get', metadata);
  }

  /**
   * Fetch details of a specific pricing plan. Currently only supports pricing plans
   * associated with courses.
   *
   * @throws FetchError<404, types.ShowPricingPlansResponse404> 404 response
   */
  showPricingPlans(metadata: types.ShowPricingPlansMetadataParam): Promise<FetchResponse<200, types.ShowPricingPlansResponse200>> {
    return this.core.fetch('/v1/pricing_plans/{pricing_plan_id}', 'get', metadata);
  }

  /**
   * Fetch all the pricing plans at your school
   *
   */
  listPricingPlans(metadata?: types.ListPricingPlansMetadataParam): Promise<FetchResponse<200, types.ListPricingPlansResponse200>> {
    return this.core.fetch('/v1/pricing_plans', 'get', metadata);
  }

  /**
   * Fetch a list of sales transactions made in your school. (New transactions can take up to
   * two minutes to be returned via API call from the time of sale.)
   *
   */
  listTransactions(metadata?: types.ListTransactionsMetadataParam): Promise<FetchResponse<200, types.ListTransactionsResponse200>> {
    return this.core.fetch('/v1/transactions', 'get', metadata);
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { CourseProgressMetadataParam, CourseProgressResponse200, CourseProgressResponse404, CreateUserBodyParam, CreateUserResponse201, CreateUserResponse400, EnrollUserBodyParam, EnrollUserResponse204, EnrollUserResponse404, EnrollUserResponse422, ListCoursesMetadataParam, ListCoursesResponse200, ListPricingPlansMetadataParam, ListPricingPlansResponse200, ListQuizzesMetadataParam, ListQuizzesResponse200, ListQuizzesResponse404, ListTransactionsMetadataParam, ListTransactionsResponse200, ListUsersMetadataParam, ListUsersResponse200, ListWebhooksResponse200, MarkLectureCompleteBodyParam, MarkLectureCompleteMetadataParam, MarkLectureCompleteResponse204, MarkLectureCompleteResponse404, MarkLectureCompleteResponse409, ShowCourseEnrollmentsMetadataParam, ShowCourseEnrollmentsResponse200, ShowCourseEnrollmentsResponse404, ShowCourseMetadataParam, ShowCourseResponse200, ShowCourseResponse404, ShowLectureMetadataParam, ShowLectureResponse200, ShowLectureResponse404, ShowPricingPlansMetadataParam, ShowPricingPlansResponse200, ShowPricingPlansResponse404, ShowQuizMetadataParam, ShowQuizResponse200, ShowQuizResponse404, ShowQuizResponsesMetadataParam, ShowQuizResponsesResponse200, ShowQuizResponsesResponse404, ShowUserMetadataParam, ShowUserResponse200, ShowUserResponse404, ShowVideoMetadataParam, ShowVideoResponse200, ShowVideoResponse404, ShowWebhookEventsMetadataParam, ShowWebhookEventsResponse200, UnenrollUserBodyParam, UnenrollUserResponse204, UnenrollUserResponse404, UpdateUserBodyParam, UpdateUserMetadataParam, UpdateUserResponse200, UpdateUserResponse404 } from './types';
