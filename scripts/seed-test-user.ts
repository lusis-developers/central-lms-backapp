
import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel } from "../src/models/user.model";

dotenv.config();

const MONGODB_URI = process.env.DB_URI;

if (!MONGODB_URI) {
  console.error("❌ DB_URI is not defined in .env");
  process.exit(1);
}

const TEST_USER = {
  name: "Tester Nabux",
  email: "testing@nabux.ec",
  password: "123456789",
  accountType: "founder",
  onboardingCompleted: true,
};

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log("✅ Connected to MongoDB");

    const existing = await UserModel.findOne({ email: TEST_USER.email });
    if (existing) {
      console.log("⚠️ User already exists. Updating password...");
      existing.password = TEST_USER.password;
      existing.accountType = "founder";
      existing.onboardingCompleted = true;
      await existing.save();
      console.log("✅ User updated.");
    } else {
      console.log("creating user...");
      await UserModel.create(TEST_USER);
      console.log("✅ User created.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding user:", error);
    process.exit(1);
  }
}

seed();
