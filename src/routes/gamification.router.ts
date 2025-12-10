import { Router } from "express";
import { getUserPoints } from "../controllers/gamification.controller";

const gamificationRouter = Router();

gamificationRouter.get("/:userId/points", getUserPoints);

export default gamificationRouter;

