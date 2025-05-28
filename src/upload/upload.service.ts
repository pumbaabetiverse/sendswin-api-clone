import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { err, ok, Result } from 'neverthrow';
import { fromPromiseResult } from '@/common/errors';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';

@Injectable()
export class UploadService {
  private logger = new Logger(UploadService.name);
  private readonly s3Client?: S3Client;
  private readonly bucketName?: string;
  private readonly publicUrl?: string;

  constructor(private readonly configService: ConfigService) {
    const r2EndpointUrl = this.configService.get<string>('R2_ENDPOINT_URL');
    const r2AccessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    const r2BucketName = this.configService.get<string>('R2_BUCKET_NAME');
    const r2PublicUrl = this.configService.get<string>('R2_PUBLIC_URL');
    // Initialize R2 client

    if (
      !r2EndpointUrl ||
      !r2AccessKeyId ||
      !r2SecretAccessKey ||
      !r2BucketName ||
      !r2PublicUrl
    ) {
      this.logger.warn('R2 upload is not configured, skipping...');
      return;
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: r2EndpointUrl,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    this.bucketName = r2BucketName;
    this.publicUrl = r2PublicUrl;
  }

  async uploadFile(
    file: MemoryStorageFile,
    folder: string = 'uploads',
  ): Promise<Result<string, Error>> {
    if (!this.s3Client || !this.bucketName || !this.publicUrl) {
      return err(new Error('R2 upload is not configured'));
    }

    // Generate a unique filename
    const fileExtension = file.mimetype.split('/')[1];
    const fileName = `${randomUUID()}.${fileExtension}`;

    // Create the full key (path) for the file
    const key = `${folder}/${fileName}`;

    // Upload the file to R2
    const sendResult = await fromPromiseResult(
      this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      ),
    );

    if (sendResult.isErr()) {
      return err(sendResult.error);
    }

    // Return information about the uploaded file
    return ok(`${this.publicUrl}/${key}`);
  }
}
