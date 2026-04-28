import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const endpointUrl = process.env['AWS_ENDPOINT_URL'];
    s3Client = new S3Client({
      region: process.env['AWS_REGION'] ?? 'us-east-1',
      ...(endpointUrl && {
        endpoint: endpointUrl,
        forcePathStyle: true, // required for MinIO and other S3-compatible stores
      }),
      credentials:
        process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY']
          ? {
              accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
              secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
            }
          : undefined,
    });
  }
  return s3Client;
}

export async function generatePresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export function toCdnUrl(s3Key: string): string {
  const domain = process.env['CLOUDFRONT_DOMAIN'] ?? '';
  return `${domain}/${s3Key}`;
}
