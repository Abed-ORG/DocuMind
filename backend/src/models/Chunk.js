import mongoose from "mongoose";

export const CHUNK_EMBEDDING_DIMENSIONS = 768;

const chunkSchema = new mongoose.Schema(
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

    text: {
      type: String,
      required: [true, "Chunk text is required."],
      validate: {
        validator(value) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Chunk text cannot be empty.",
      },
    },

    embedding: {
      type: [Number],
      default: undefined,
      validate: [
        {
          validator(value) {
            return (
              value === undefined ||
              (Array.isArray(value) &&
                value.length ===
                  CHUNK_EMBEDDING_DIMENSIONS
              )
            );
          },
          message: `Embedding must contain ${CHUNK_EMBEDDING_DIMENSIONS} dimensions.`,
        },
        {
          validator(value) {
            if (value === undefined) {
              return true;
            }

            return (
              Array.isArray(value) &&
              value.every((dimension) =>
                Number.isFinite(dimension)
              )
            );
          },
          message:
            "Embedding must contain only finite numbers.",
        },
      ],
    },

    chunkIndex: {
      type: Number,
      required: [true, "Chunk index is required."],
      min: [0, "Chunk index cannot be negative."],
    },

    pageNumber: {
      type: Number,
      required: [true, "Page number is required."],
      min: [1, "Page number must be at least 1."],
    },

    sectionHeader: {
      type: String,
      trim: true,
      maxlength: [
        300,
        "Section header cannot exceed 300 characters.",
      ],
      default: "",
    },

    charStart: {
      type: Number,
      required: [
        true,
        "Chunk start character offset is required.",
      ],
      min: [
        0,
        "Chunk start character offset cannot be negative.",
      ],
    },

    charEnd: {
      type: Number,
      required: [
        true,
        "Chunk end character offset is required.",
      ],
      min: [
        0,
        "Chunk end character offset cannot be negative.",
      ],
      validate: {
        validator(value) {
          return (
            this.charStart === undefined ||
            value >= this.charStart
          );
        },
        message:
          "Chunk end character offset cannot be before start offset.",
      },
    },
  },
  {
    timestamps: true,
  }
);

chunkSchema.index(
  {
    documentId: 1,
    chunkIndex: 1,
  },
  {
    unique: true,
  }
);

chunkSchema.index({
  workspaceId: 1,
  documentId: 1,
});

const Chunk = mongoose.model("Chunk", chunkSchema);

export default Chunk;
