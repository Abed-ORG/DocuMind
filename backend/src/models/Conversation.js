import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required."],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Conversation title is required."],
      trim: true,
      maxlength: [
        120,
        "Conversation title cannot exceed 120 characters.",
      ],
      default: "New Conversation",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({
  workspaceId: 1,
  lastMessageAt: -1,
});

const Conversation = mongoose.model(
  "Conversation",
  conversationSchema
);

export default Conversation;
