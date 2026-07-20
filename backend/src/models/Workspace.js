import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required."],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Workspace name is required."],
      trim: true,
      maxlength: [80, "Workspace name cannot exceed 80 characters."],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        500,
        "Workspace description cannot exceed 500 characters.",
      ],
      default: "",
    },

    color: {
      type: String,
      required: [true, "Workspace color is required."],
      trim: true,
      default: "#4F46E5",
      match: [
        /^#[0-9A-Fa-f]{6}$/,
        "Workspace color must be a valid hex color.",
      ],
    },
  },
  {
    timestamps: true,
  }
);

workspaceSchema.index({
  userId: 1,
  updatedAt: -1,
});

const Workspace = mongoose.model(
  "Workspace",
  workspaceSchema
);

export default Workspace;
