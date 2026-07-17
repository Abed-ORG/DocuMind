import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { env } from "../config/env.js";

export async function protect(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authorizationHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const decodedToken = jwt.verify(
      token,
      env.jwtSecret
    );

    const user = await User.findById(
      decodedToken.userId
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user for this token no longer exists.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    next(error);
  }
}