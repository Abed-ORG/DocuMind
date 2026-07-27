import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required."],
      index: true,
    },

    filename: {
      type: String,
      required: [true, "Stored filename is required."],
      trim: true,
    },

    originalName: {
      type: String,
      required: [true, "Original filename is required."],
      trim: true,
      maxlength: [
        255,
        "Original filename cannot exceed 255 characters.",
      ],
    },

    format: {
      type: String,
      required: [true, "Document format is required."],
      enum: {
        values: ["PDF", "DOCX", "TXT", "CSV"],
        message:
          "Document format must be PDF, DOCX, TXT, or CSV.",
      },
    },

    pageCount: {
      type: Number,
      min: [0, "Page count cannot be negative."],
      default: 0,
    },

    fileSize: {
      type: Number,
      required: [true, "File size is required."],
      min: [0, "File size cannot be negative."],
    },

    contentHash: {
      type: String,
      required: [true, "Content hash is required."],
      lowercase: true,
      trim: true,
      match: [
        /^[a-f0-9]{64}$/,
        "Content hash must be a SHA-256 hash.",
      ],
    },

    status: {
      type: String,
      enum: {
        values: [
          "uploaded",
          "processing",
          "ready",
          "failed",
        ],
        message:
          "Document status must be uploaded, processing, ready, or failed.",
      },
      default: "uploaded",
    },

    filePath: {
      type: String,
      required: [true, "File path is required."],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({
  workspaceId: 1,
  createdAt: -1,
});

documentSchema.index({
  workspaceId: 1,
  originalName: 1,
  contentHash: 1,
});

const Document = mongoose.model(
  "Document",
  documentSchema
);

export default Document;
