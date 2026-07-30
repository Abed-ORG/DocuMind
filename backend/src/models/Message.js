import mongoose from "mongoose";

const citationSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [
        20,
        "Citation label cannot exceed 20 characters.",
      ],
    },

    citationNumber: {
      type: Number,
      min: [
        1,
        "Citation number must be at least 1.",
      ],
    },

    chunkId: {
      type: String,
      trim: true,
    },

    documentId: {
      type: String,
      trim: true,
    },

    documentName: {
      type: String,
      trim: true,
      maxlength: [
        255,
        "Citation document name cannot exceed 255 characters.",
      ],
      default: "",
    },

    pageNumber: {
      type: Number,
      min: [
        1,
        "Citation page number must be at least 1.",
      ],
    },

    chunkIndex: {
      type: Number,
      min: [
        0,
        "Citation chunk index cannot be negative.",
      ],
    },

    sectionHeader: {
      type: String,
      trim: true,
      maxlength: [
        300,
        "Citation section header cannot exceed 300 characters.",
      ],
      default: "",
    },

    score: {
      type: Number,
    },

    text: {
      type: String,
      trim: true,
      maxlength: [
        4000,
        "Citation text cannot exceed 4000 characters.",
      ],
      default: "",
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Conversation is required."],
      index: true,
    },

    role: {
      type: String,
      required: [true, "Message role is required."],
      enum: {
        values: [
          "user",
          "assistant",
        ],
        message:
          "Message role must be user or assistant.",
      },
    },

    content: {
      type: String,
      required: [true, "Message content is required."],
      trim: true,
      maxlength: [
        20000,
        "Message content cannot exceed 20000 characters.",
      ],
      validate: {
        validator(value) {
          return (
            typeof value === "string" &&
            value.trim().length > 0
          );
        },
        message: "Message content cannot be empty.",
      },
    },

    citations: {
      type: [citationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({
  conversationId: 1,
  createdAt: 1,
});

const Message = mongoose.model(
  "Message",
  messageSchema
);

export default Message;
