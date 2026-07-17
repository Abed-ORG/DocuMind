import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  try {
    const connection = await mongoose.connect(env.mongodbUri);

    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    process.exit(1);
  }
}