"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_model_1 = require("../src/models/user.model");
dotenv_1.default.config();
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
        await mongoose_1.default.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");
        const existing = await user_model_1.UserModel.findOne({ email: TEST_USER.email });
        if (existing) {
            console.log("⚠️ User already exists. Updating password...");
            existing.password = TEST_USER.password;
            existing.accountType = "founder";
            existing.onboardingCompleted = true;
            await existing.save();
            console.log("✅ User updated.");
        }
        else {
            console.log("creating user...");
            await user_model_1.UserModel.create(TEST_USER);
            console.log("✅ User created.");
        }
        process.exit(0);
    }
    catch (error) {
        console.error("Error seeding user:", error);
        process.exit(1);
    }
}
seed();
