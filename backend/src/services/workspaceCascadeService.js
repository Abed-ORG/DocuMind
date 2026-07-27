import mongoose from "mongoose";

const collectionNames = {
  documents: "documents",
  chunks: "chunks",
  embeddings: "embeddings",
  conversations: "conversations",
  messages: "messages",
  summaries: "summaries",
};

function withStringForms(ids) {
  const values = [];

  ids.forEach((id) => {
    if (id === undefined || id === null) {
      return;
    }

    values.push(id);

    if (typeof id !== "string") {
      values.push(id.toString());
    }
  });

  return values;
}

function fieldIn(field, values) {
  return {
    [field]: {
      $in: values,
    },
  };
}

function orFilter(filters) {
  if (filters.length === 1) {
    return filters[0];
  }

  return {
    $or: filters,
  };
}

function getCollection(collectionName) {
  return mongoose.connection.db.collection(
    collectionName
  );
}

async function findIds(collectionName, filter) {
  const records = await getCollection(collectionName)
    .find(filter, {
      projection: {
        _id: 1,
      },
    })
    .toArray();

  return records.map((record) => record._id);
}

async function deleteFromCollection(
  collectionName,
  filter
) {
  const result = await getCollection(
    collectionName
  ).deleteMany(filter);

  return result.deletedCount ?? 0;
}

export async function cascadeDeleteWorkspaceData({
  workspaceId,
}) {
  const workspaceIds = withStringForms([
    workspaceId,
  ]);

  const workspaceFilter = fieldIn(
    "workspaceId",
    workspaceIds
  );

  const documentIds = withStringForms(
    await findIds(
      collectionNames.documents,
      workspaceFilter
    )
  );

  const conversationIds = withStringForms(
    await findIds(
      collectionNames.conversations,
      workspaceFilter
    )
  );

  const documentFilter = fieldIn(
    "documentId",
    documentIds
  );

  const conversationFilter = fieldIn(
    "conversationId",
    conversationIds
  );

  const documentRelatedFilters = [
    workspaceFilter,
  ];

  if (documentIds.length > 0) {
    documentRelatedFilters.push(documentFilter);
  }

  const conversationRelatedFilters = [
    workspaceFilter,
  ];

  if (conversationIds.length > 0) {
    conversationRelatedFilters.push(
      conversationFilter
    );
  }

  const summaryFilters = [
    ...documentRelatedFilters,
  ];

  if (conversationIds.length > 0) {
    summaryFilters.push(conversationFilter);
  }

  return {
    messages: await deleteFromCollection(
      collectionNames.messages,
      orFilter(conversationRelatedFilters)
    ),
    summaries: await deleteFromCollection(
      collectionNames.summaries,
      orFilter(summaryFilters)
    ),
    chunks: await deleteFromCollection(
      collectionNames.chunks,
      orFilter(documentRelatedFilters)
    ),
    embeddings: await deleteFromCollection(
      collectionNames.embeddings,
      orFilter(documentRelatedFilters)
    ),
    conversations: await deleteFromCollection(
      collectionNames.conversations,
      workspaceFilter
    ),
    documents: await deleteFromCollection(
      collectionNames.documents,
      workspaceFilter
    ),
  };
}

export async function cascadeDeleteDocumentData({
  documentId,
}) {
  const documentIds = withStringForms([
    documentId,
  ]);

  const documentFilter = fieldIn(
    "documentId",
    documentIds
  );

  return {
    summaries: await deleteFromCollection(
      collectionNames.summaries,
      documentFilter
    ),
    chunks: await deleteFromCollection(
      collectionNames.chunks,
      documentFilter
    ),
    embeddings: await deleteFromCollection(
      collectionNames.embeddings,
      documentFilter
    ),
  };
}
