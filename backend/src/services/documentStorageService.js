import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "../config/env.js";

const r2Client =
  env.documentStorageProvider === "r2"
    ? new S3Client({
        region: "auto",
        endpoint: env.r2Endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: env.r2AccessKeyId,
          secretAccessKey: env.r2SecretAccessKey,
        },
      })
    : null;

export function isR2StorageEnabled() {
  return env.documentStorageProvider === "r2";
}

export function getDocumentStorageProvider(document) {
  return document.storageProvider ?? "local";
}

export function getR2BucketName() {
  return env.r2BucketName;
}

export function createDocumentStorageKey({
  workspaceId,
  filename,
}) {
  return path.posix.join(
    "workspaces",
    workspaceId.toString(),
    "documents",
    filename
  );
}

function getR2Client() {
  if (!r2Client) {
    throw new Error(
      "R2 storage is not configured."
    );
  }

  return r2Client;
}

function toNodeReadable(body) {
  if (!body) {
    throw new Error("R2 object response is empty.");
  }

  if (typeof body.pipe === "function") {
    return body;
  }

  if (typeof body.transformToWebStream === "function") {
    return Readable.fromWeb(
      body.transformToWebStream()
    );
  }

  return Readable.from(body);
}

function createNotFoundError(error) {
  if (
    error?.name === "NoSuchKey" ||
    error?.$metadata?.httpStatusCode === 404
  ) {
    const notFoundError = new Error(
      "The stored document file could not be found."
    );
    notFoundError.code = "ENOENT";
    return notFoundError;
  }

  return error;
}

export async function uploadDocumentToR2({
  filePath,
  storageKey,
  contentType,
}) {
  try {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: env.r2BucketName,
        Key: storageKey,
        Body: fs.createReadStream(filePath),
        ContentType: contentType,
      })
    );
  } catch (error) {
    throw createNotFoundError(error);
  }
}

export async function getR2DocumentStream(
  storageKey
) {
  try {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: env.r2BucketName,
        Key: storageKey,
      })
    );

    return toNodeReadable(response.Body);
  } catch (error) {
    throw createNotFoundError(error);
  }
}

export async function downloadDocumentFromR2({
  storageKey,
  destinationPath,
}) {
  await fsPromises.mkdir(
    path.dirname(destinationPath),
    {
      recursive: true,
    }
  );

  const body = await getR2DocumentStream(storageKey);

  await pipeline(
    body,
    fs.createWriteStream(destinationPath)
  );
}

export async function deleteDocumentFromR2(
  storageKey
) {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: env.r2BucketName,
        Key: storageKey,
      })
    );
  } catch (error) {
    throw createNotFoundError(error);
  }
}

export function createTempDocumentPath(filename) {
  return path.join(
    tmpdir(),
    "documind-documents",
    `${Date.now()}-${randomUUID()}-${path.basename(filename)}`
  );
}
