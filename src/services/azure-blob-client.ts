import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { AzureBlobError } from '../errors/azure-blob-error';
import { config } from '../config';
import { logger } from '../libraries/logger';

export class AzureBlobClient {
  private blobServiceClient: BlobServiceClient;

  constructor(private containerName = config.azureBlob.containerName) {
    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.azureBlob.connectionString);
    } catch (error) {
      const err = new AzureBlobError(`Failed to instantiate BlobServiceClient from connection string. ${(error as Error).message}`);
      logger.error(err, 'AzureBlobClient::constructor: Failed to instantiate BlobServiceClient', {
        cause: (error as Error).message,
      });
      throw err;
    }
  }

  public async listFiles(directoryPath: string): Promise<string[]> {
    const containerClient = await this.getContainerClient();
    try {
      const blobNames = [];
      const iterator = containerClient.listBlobsByHierarchy('/', {
        prefix: `${directoryPath}/`,
      });
      // eslint-disable-next-line no-restricted-syntax
      for await (const item of iterator) {
        if (item.kind === 'blob') {
          blobNames.push(item.name);
        }
      }
      return blobNames;
    } catch (error) {
      const err = new AzureBlobError(`Failed to list files in directory ${directoryPath}. ${(error as Error).message}`);
      logger.error(err, 'AzureBlobClient::listFiles: Failed to list files', {
        directoryPath,
        cause: (error as Error).message,
      });
      throw err;
    }
  }

  public async downloadFile(filePath: string): Promise<Buffer> {
    const containerClient = await this.getContainerClient();
    try {
      return await containerClient
        .getBlockBlobClient(filePath)
        .downloadToBuffer();
    } catch (error) {
      const err = new AzureBlobError(`Failed to download file ${filePath}. ${(error as Error).message}`);
      logger.error(err, 'AzureBlobClient::downloadFile: Failed to download file', {
        filePath,
        cause: (error as Error).message,
      });
      throw err;
    }
  }

  public async uploadFile(filePath: string, content: string): Promise<void> {
    const containerClient = await this.getContainerClient();
    const uploadResponse = await containerClient
      .getBlockBlobClient(filePath)
      .upload(content, Buffer.byteLength(content));
    if (uploadResponse.errorCode) {
      const err = new AzureBlobError(`Failed to upload file ${filePath}, error code: ${uploadResponse.errorCode}`);
      logger.error(err, 'AzureBlobClient::uploadFile: Failed to upload file', {
        filePath,
        errorCode: uploadResponse.errorCode,
      });
      throw err;
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    const containerClient = await this.getContainerClient();
    const deleteResponse = await containerClient.deleteBlob(filePath);
    if (deleteResponse.errorCode) {
      const err = new AzureBlobError(`Failed to delete file ${filePath}, error code: ${deleteResponse.errorCode}`);
      logger.error(err, 'AzureBlobClient::deleteFile: Failed to delete file', {
        filePath,
        errorCode: deleteResponse.errorCode,
      });
      throw err;
    }
  }

  private async getContainerClient(): Promise<ContainerClient> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();
      return containerClient;
    } catch (error) {
      const err = new AzureBlobError(`Failed to get container client. ${(error as Error).message}`);
      logger.error(err, 'AzureBlobClient::getContainerClient: Failed to get container client', {
        cause: (error as Error).message,
      });
      throw err;
    }
  }
}
