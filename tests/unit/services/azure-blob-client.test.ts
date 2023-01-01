import { mocked } from 'ts-jest/utils';
import { mock } from 'jest-mock-extended';
import {
  BlobServiceClient, ContainerClient, BlockBlobClient, BlockBlobUploadResponse, BlobDeleteResponse,
} from '@azure/storage-blob';
import { AzureBlobClient } from '../../../src/services/azure-blob-client';
import { AzureBlobError } from '../../../src/errors/azure-blob-error';

jest.mock('@azure/storage-blob');
const mockedBlobServiceClient = mocked(BlobServiceClient);
const mockedBlobServiceClientInstance = mock<BlobServiceClient>();
const mockedContainerClient = mock<ContainerClient>();
const mockedBlockBlobClient = mock<BlockBlobClient>();

describe('AzureBlobClient', () => {
  let blobClient: AzureBlobClient;
  beforeEach(() => {
    mockedContainerClient.getBlockBlobClient.mockReturnValue(mockedBlockBlobClient);
    mockedBlobServiceClientInstance.getContainerClient.mockReturnValue(mockedContainerClient);
    mockedBlobServiceClient.fromConnectionString.mockReturnValue(mockedBlobServiceClientInstance);
    blobClient = new AzureBlobClient('mock-container-name');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('listFiles', () => {
    test('returns array of filepaths stored at the given directory path', async () => {
      mockedContainerClient.listBlobsByHierarchy.mockReturnValue([
        { kind: 'blob', name: 'dir/subdir/fileA.json' },
        { kind: 'blob', name: 'dir/subdir/fileB.json' },
        { kind: 'prefix', name: 'dir/subdir' },
      ] as any);

      const result = await blobClient.listFiles('dir/subdir');

      expect(mockedContainerClient.listBlobsByHierarchy).toHaveBeenCalledWith('/', { prefix: 'dir/subdir/' });
      expect(result).toStrictEqual(['dir/subdir/fileA.json', 'dir/subdir/fileB.json']);
    });

    test('throws AzureBlobError if call fails', async () => {
      const asyncIterableError = {
        [Symbol.asyncIterator]() {
          return {
            next() {
              throw new Error('Reason for list files failure');
            },
          };
        },
      };
      mockedContainerClient.listBlobsByHierarchy.mockReturnValue(asyncIterableError as any);

      await expect(blobClient.listFiles('dir/subdir')).rejects.toStrictEqual(
        new AzureBlobError('Failed to list files in directory dir/subdir. Reason for list files failure'),
      );
    });
  });

  describe('downloadFile', () => {
    test('returns file Buffer given filepath to download', async () => {
      const mockFileBuffer = Buffer.alloc(0);
      mockedBlockBlobClient.downloadToBuffer.mockResolvedValue(mockFileBuffer);

      const result = await blobClient.downloadFile('dir/subdir/fileA.json');

      expect(mockedContainerClient.getBlockBlobClient).toHaveBeenCalledWith('dir/subdir/fileA.json');
      expect(result).toStrictEqual(mockFileBuffer);
    });

    test('throws AzureBlobError if call fails', async () => {
      mockedBlockBlobClient.downloadToBuffer.mockRejectedValue(new Error('Reason for download failure'));

      await expect(blobClient.downloadFile('dir/subdir/fileA.json')).rejects.toStrictEqual(
        new AzureBlobError('Failed to download file dir/subdir/fileA.json. Reason for download failure'),
      );
    });
  });

  describe('uploadFile', () => {
    test('uploads file given filepath and content', async () => {
      const mockContent = 'mock-content';
      mockedBlockBlobClient.upload.mockResolvedValue({} as BlockBlobUploadResponse);

      await blobClient.uploadFile('dir/subdir/fileB.json', mockContent);

      expect(mockedContainerClient.getBlockBlobClient).toHaveBeenCalledWith('dir/subdir/fileB.json');
      expect(mockedBlockBlobClient.upload).toHaveBeenCalledWith(mockContent, Buffer.byteLength(mockContent));
    });

    test('throws AzureBlobError if response contains error code', async () => {
      const mockContent = 'mock-content';
      mockedBlockBlobClient.upload.mockResolvedValue({ errorCode: '400' } as BlockBlobUploadResponse);

      await expect(blobClient.uploadFile('dir/subdir/fileB.json', mockContent)).rejects.toStrictEqual(
        new AzureBlobError('Failed to upload file dir/subdir/fileB.json, error code: 400'),
      );
    });
  });

  describe('deleteFile', () => {
    test('deletes file given filepath', async () => {
      mockedContainerClient.deleteBlob.mockResolvedValue({} as BlobDeleteResponse);

      await blobClient.deleteFile('dir/subdir/fileB.json');

      expect(mockedContainerClient.deleteBlob).toHaveBeenCalledWith('dir/subdir/fileB.json');
    });

    test('throws AzureBlobError if response contains error code', async () => {
      mockedContainerClient.deleteBlob.mockResolvedValue({ errorCode: '400' } as BlobDeleteResponse);

      await expect(blobClient.deleteFile('dir/subdir/fileB.json')).rejects.toStrictEqual(
        new AzureBlobError('Failed to delete file dir/subdir/fileB.json, error code: 400'),
      );
    });
  });
});
