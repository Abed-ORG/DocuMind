import mongoose from "mongoose";

export const SUMMARY_LEVELS = [
  "one-liner",
  "executive",
  "detailed",
];

const summarySchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: [true, "Document is required."],
      index: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required."],
      index: true,
    },

    level: {
      type: String,
      required: [true, "Summary level is required."],
      enum: {
        values: SUMMARY_LEVELS,
        message:
          "Summary level must be one-liner, executive, or detailed.",
      },
    },

    content: {
      type: String,
      required: [true, "Summary content is required."],
      trim: true,
      validate: {
        validator(value) {
          return (
            typeof value === "string" &&
            value.trim().length > 0
          );
        },
        message: "Summary content cannot be empty.",
      },
    },

    generatedAt: {
      type: Date,
      default: Date.now,
      required: [true, "Generated timestamp is required."],
    },
  },
  {
    timestamps: true,
  }
);

summarySchema.index(
  {
    documentId: 1,
    level: 1,
  },
  {
    unique: true,
  }
);

summarySchema.index({
  workspaceId: 1,
  documentId: 1,
});

const Summary = mongoose.model(
  "Summary",
  summarySchema
);

export default Summary;
