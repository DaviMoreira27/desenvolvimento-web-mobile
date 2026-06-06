import type { AzureStorageService } from "../../src/services/azureStorage";

const mockUploadData = jest.fn().mockResolvedValue({});
const mockGenerateSasUrl = jest.fn().mockResolvedValue("https://account.blob.core.windows.net/container/blob?sas=token");
const mockGetBlockBlobClient = jest.fn(() => ({
  uploadData: mockUploadData,
}));
const mockGetBlobClient = jest.fn(() => ({
  generateSasUrl: mockGenerateSasUrl,
}));
const mockGetContainerClient = jest.fn(() => ({
  getBlockBlobClient: mockGetBlockBlobClient,
  getBlobClient: mockGetBlobClient,
}));

jest.mock("@azure/storage-blob", () => ({
  BlobServiceClient: jest.fn().mockImplementation(() => ({
    getContainerClient: mockGetContainerClient,
  })),
  StorageSharedKeyCredential: jest.fn().mockImplementation(() => ({})),
  BlobSASPermissions: { parse: jest.fn().mockReturnValue({ read: true }) },
  generateBlobSASQueryParameters: jest.fn().mockReturnValue({ toString: () => "sas=token" }),
}));

describe("azureStorage service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AZURE_STORAGE_ACCOUNT_NAME: "testaccount",
      AZURE_STORAGE_ACCOUNT_KEY: "dGVzdGtleQ==",
      AZURE_STORAGE_CONTAINER_NAME: "testcontainer",
      AZURE_SAS_TTL_SECONDS: "3600",
    };
    jest.resetModules();
    mockUploadData.mockClear();
    mockGenerateSasUrl.mockClear();
    mockGetBlockBlobClient.mockClear();
    mockGetBlobClient.mockClear();
    mockGetContainerClient.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("uploadBlob", () => {
    it("calls uploadData with the provided buffer and content type", async () => {
      const { azureStorage } = await import("../../src/services/azureStorage");
      const buffer = Buffer.from("test file content");
      const blobName = "consultas/1/1717600000000-test.pdf";
      const contentType = "application/pdf";

      await azureStorage.uploadBlob(buffer, blobName, contentType);

      expect(mockGetContainerClient).toHaveBeenCalledWith("testcontainer");
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(blobName);
      expect(mockUploadData).toHaveBeenCalledWith(buffer, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
    });

    it("propagates errors thrown by the Azure SDK", async () => {
      const { azureStorage } = await import("../../src/services/azureStorage");
      mockUploadData.mockRejectedValueOnce(new Error("Azure network error"));

      await expect(
        azureStorage.uploadBlob(Buffer.from("data"), "blob/name", "text/plain")
      ).rejects.toThrow("Azure network error");
    });
  });

  describe("generateSasUrl", () => {
    it("returns an HTTPS URL string", async () => {
      const { azureStorage } = await import("../../src/services/azureStorage");
      const url = await azureStorage.generateSasUrl("consultas/1/file.pdf", 3600);

      expect(typeof url).toBe("string");
      expect(url).toMatch(/^https:\/\//);
    });

    it("uses the configured container", async () => {
      const { azureStorage } = await import("../../src/services/azureStorage");
      await azureStorage.generateSasUrl("consultas/1/file.pdf", 3600);

      expect(mockGetContainerClient).toHaveBeenCalledWith("testcontainer");
    });
  });
});
