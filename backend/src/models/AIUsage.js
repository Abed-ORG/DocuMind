import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required."],
      index: true,
    },

    feature: {
      type: String,
      required: [true, "AI usage feature is required."],
      enum: {
        values: [
          "chat",
          "summary",
          "comparison",
          "extraction",
        ],
        message:
          "AI usage feature must be chat, summary, comparison, or extraction.",
      },
      index: true,
    },

    model: {
      type: String,
      trim: true,
      maxlength: [
        120,
        "AI usage model cannot exceed 120 characters.",
      ],
      default: "",
    },

    inputTokenCount: {
      type: Number,
      min: [
        0,
        "Input token count cannot be negative.",
      ],
      default: 0,
    },

    outputTokenCount: {
      type: Number,
      min: [
        0,
        "Output token count cannot be negative.",
      ],
      default: 0,
    },

    totalTokenCount: {
      type: Number,
      min: [
        0,
        "Total token count cannot be negative.",
      ],
      default: 0,
    },

    cachedTokenCount: {
      type: Number,
      min: [
        0,
        "Cached token count cannot be negative.",
      ],
      default: 0,
    },

    thoughtsTokenCount: {
      type: Number,
      min: [
        0,
        "Thoughts token count cannot be negative.",
      ],
      default: 0,
    },

    estimatedCostUsd: {
      type: Number,
      min: [
        0,
        "Estimated cost cannot be negative.",
      ],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

aiUsageSchema.index({
  workspaceId: 1,
  createdAt: -1,
});

const AIUsage = mongoose.model(
  "AIUsage",
  aiUsageSchema
);

export default AIUsage;
