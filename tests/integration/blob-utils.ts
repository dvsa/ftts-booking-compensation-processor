/* eslint-disable no-restricted-syntax */
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

export const getContainerClient = (connectionString: string, containerName: string): ContainerClient => {
  const azureBlobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return azureBlobServiceClient.getContainerClient(containerName);
};

export const deleteAllBlobs = async (containerClient: ContainerClient): Promise<void> => {
  await containerClient.createIfNotExists();
  for await (const blob of containerClient.listBlobsFlat()) {
    await containerClient.deleteBlob(blob.name);
  }
};

export const uploadBlob = async (containerClient: ContainerClient, path: string, content: string): Promise<void> => {
  await containerClient
    .getBlockBlobClient(path)
    .upload(content, Buffer.byteLength(content));
};

export const listBlobPaths = async (containerClient: ContainerClient): Promise<string[]> => {
  const blobPaths = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    blobPaths.push(blob.name);
  }
  return blobPaths;
};

export const retrieveCsvString = async (containerClient: ContainerClient, csvFile: string): Promise<string> => {
  const files = await listBlobPaths(containerClient);
  let filepath;
  files.forEach((file) => {
    if (file.endsWith(`${csvFile}.csv`)) {
      filepath = file;
    }
  });

  if (!filepath) {
    throw Error('Csv not found');
  }

  const response = await containerClient.getBlobClient(filepath).downloadToBuffer();
  return response.toString();
};
