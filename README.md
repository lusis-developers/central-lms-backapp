# FudMasters BackApp

A backend application for FudMasters, built with Node.js, TypeScript, and Express. It provides RESTful APIs for managing careers, courses, users, quizzes, comments, and gamification features, integrated with the Teachable platform.

## Features

- User authentication and management
- Career and course management
- Quiz system with submissions
- Comments and discussions
- Gamification with points
- Email services
- Integration with Teachable API

## Prerequisites

- Node.js (version 18 or higher)
- pnpm or npm
- MongoDB

## Setup

1. Clone the repository and navigate to the project directory.


2. Install the Teachable API package:

   ```bash
   npx api install "@teachable/v1.1#zs42jfm1ziq55k"
   ```

   During the installation prompts:
   - Choose **javascript** as the language.
   - Choose **commonjs** as the import/export style.
   - Choose **y** to proceed.

3. Run the postinstall script to verify the package:

   ```bash
   pnpm postinstall
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

- `PORT`: Server port (default: 8100)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT tokens
- Other API keys as needed (e.g., for email services, cloudinary, etc.)

## Running the Application

To start the development server:

```bash
pnpm dev
```

The server will start on the specified port (default: 8100).

## Building for Production

```bash
pnpm build
```

## Scripts

- `pnpm dev`: Start development server with hot reload
- `pnpm build`: Compile TypeScript to JavaScript
- `pnpm start`: Start production server
- `pnpm compile`: Watch and compile TypeScript
- `pnpm format`: Format code with Prettier
- `pnpm postinstall`: Verify Teachable package installation

## Project Structure

- `src/`: Source code
  - `controllers/`: Route handlers
  - `models/`: Mongoose models
  - `routes/`: Express routes
  - `services/`: Business logic services
  - `middlewares/`: Express middlewares
  - `config/`: Configuration files
  - `types/`: TypeScript type definitions
- `scripts/`: Utility scripts

## License

ISC