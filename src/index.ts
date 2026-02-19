import * as dotenv from "dotenv";
dotenv.config();

import createApp from "./app";
import dbConnect from "./config/mongo";
import { initializeSchedulers } from "./schedulers";
import { models } from "./models";

let initPromise: Promise<void> | null = null;

function getInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await dbConnect();
      await ensureDefaultCareer();
      initializeSchedulers();
    })();
  }
  return initPromise;
}

const { app, server } = createApp();

async function ensureDefaultCareer(): Promise<void> {
  try {
    const name = "FudMasters Growth Essentials";
    const description = "A cohesive path covering Meta Ads setup, differentiated cost fundamentals, brand humanization basics, and lean validation for new products.";
    const courseIds = [2916425, 2917269, 2917339, 2917848];
    const existing = await models.careers.findOne({ name }).lean();
    if (existing) return;
    await models.careers.create({ name, description, imageUrl: null, courseIds, isActive: true });
  } catch (error) {
    console.error("Error ensuring default career", error);
  }
}

if (process.env.VERCEL) {
  // Vercel serverless: export handler en lugar de server.listen()
  // La DB se inicializa una vez y se reutiliza en invocaciones warm (cached)
  module.exports = async (req: any, res: any) => {
    await getInit();
    app(req, res);
  };
} else {
  // Local dev: inicializar y levantar el servidor normalmente
  const PORT = process.env.PORT || 3000;
  getInit().then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  });
}
