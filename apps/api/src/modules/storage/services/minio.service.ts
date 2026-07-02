import { Injectable } from '@nestjs/common';

@Injectable()
export class MinioService {
  async generatePresignedUrl(bucketName: string, objectName: string): Promise<string> {
    // S3 Minio presigned URL logic placeholder
    return `https://storage.dentalflow.com/${bucketName}/${objectName}`;
  }
}
