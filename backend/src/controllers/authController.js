import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Document from "../models/Document.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { env } from "../config/env.js";

const storageLimitBytes = 100 * 1024 * 1024;

function generateToken(userId) {
  return jwt.sign(
    {
      userId,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
}

async function calculateStorageUsedBytes(userId) {
  const workspaceIds = await Workspace.find({
    userId,
  }).distinct("_id");

  if (workspaceIds.length === 0) {
    return 0;
  }

  const [storageStats] = await Document.aggregate([
    {
      $match: {
        workspaceId: {
          $in: workspaceIds,
        },
      },
    },
    {
      $group: {
        _id: null,
        storageUsedBytes: {
          $sum: "$fileSize",
        },
      },
    },
  ]);

  return storageStats?.storageUsedBytes ?? 0;
}

async function getUserStorageUsedBytes(user) {
  const storageUsedBytes =
    await calculateStorageUsedBytes(user._id);

  if (
    user.storageUsedBytes !== storageUsedBytes
  ) {
    await User.updateOne(
      {
        _id: user._id,
      },
      {
        storageUsedBytes,
      }
    );
  }

  return storageUsedBytes;
}

async function formatUser(user) {
  const storageUsedBytes =
    await getUserStorageUsedBytes(user);

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    storageUsedBytes,
    storageLimitBytes,
    createdAt: user.createdAt,
  };
}

export async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password } = req.body;

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: passwordHash,
    });

    const token = generateToken(user._id.toString());

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: await formatUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: await formatUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await formatUser(req.user);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}
