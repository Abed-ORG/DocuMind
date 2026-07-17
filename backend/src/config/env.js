import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer.");
}

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from the .env file.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the .env file.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
};