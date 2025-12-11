import * as dotenv from "dotenv";
import createApp from "./app";
import dbConnect from "./config/mongo";
import { initializeSchedulers } from "./schedulers";
import { models } from "./models";

async function main() {
  dotenv.config();

  await dbConnect();

  await ensureDefaultCareer();

  initializeSchedulers();

  const { app, server } = createApp();

  server.timeout = 10 * 60 * 1000;

  const port: number | string = process.env.PORT || 8100;

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

main();

async function ensureDefaultCareer(): Promise<void> {
  try {
    const name = "FudMasters Growth Essentials";
    const description = "Path combining Ads setup, cost fundamentals and brand humanization.";
    const courseIds = [2916425, 2917269, 2917339];
    const existing = await models.careers.findOne({ name }).lean();
    if (existing) return;
    await models.careers.create({ name, description, imageUrl: null, courseIds, isActive: true });
  } catch (error) {
    console.error("Error ensuring default career", error);
  }
}
