# STAGE 34A — File Storage Security Implementation

**Subject:** Cryptographically Isolated Tenant File Storage
**Stack:** NestJS, Prisma, MinIO (S3-Compatible), Node Crypto
**Core Features:** Pre-Signed URLs, Zero-Trust Object Keys, Two-Step Upload Architecture.

---

## Folder Structure
```text
src/modules/storage/
├── controllers/
│   └── storage.controller.ts
├── services/
│   └── storage.service.ts
├── dto/
│   └── storage.dto.ts
└── storage.module.ts
```

---

## 1. DTOs

### `src/modules/storage/dto/storage.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsNumber, Max } from 'class-validator';

export class RequestUploadDto {
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsEnum(['image/jpeg', 'image/png', 'application/pdf', 'application/dicom'])
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @Max(50 * 1024 * 1024) // 50MB absolute limit
  sizeBytes: number;
}

export class ConfirmUploadDto {
  @IsUUID()
  @IsNotEmpty()
  fileId: string;
}
```
*   **Purpose:** Validates file requests before negotiating with MinIO.
*   **Security considerations:** Explicitly limits `mimeType` to prevent clinics from uploading executable malware (`.exe`, `.sh`) which could be distributed maliciously. Hard caps filesize at 50MB.

---

## 2. Services

### `src/modules/storage/services/storage.service.ts`
```typescript
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Client } from 'minio'; // S3 Compatible SDK
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private minioClient: Client;
  private readonly BUCKET = process.env.MINIO_BUCKET_NAME || 'dentalflow';

  constructor(private prisma: PrismaService) {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: 9000,
      useSSL: process.env.NODE_ENV === 'production',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }

  async requestUploadUrl(tenantId: string, userId: string, dto: RequestUploadDto) {
    // 1. Verify Patient belongs to this Tenant
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId } });
    if (!patient) throw new ForbiddenException('Patient not found');

    // 2. MATHEMATICAL TENANT ISOLATION (The Object Key Strategy)
    // The frontend has zero control over this path.
    const fileExtension = dto.fileName.split('.').pop();
    const secureRandomId = crypto.randomUUID();
    const s3ObjectKey = `${tenantId}/patients/${dto.patientId}/${secureRandomId}.${fileExtension}`;

    // 3. Create Pending Database Record
    const fileRecord = await this.prisma.patientFile.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        uploadedByUserId: userId,
        originalName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        bucketName: this.BUCKET,
        s3ObjectKey,
        status: 'PENDING'
      }
    });

    // 4. Generate Pre-Signed PUT URL (Valid for 15 minutes)
    const presignedUrl = await this.minioClient.presignedPutObject(
      this.BUCKET, 
      s3ObjectKey, 
      15 * 60 // 900 seconds
    );

    return {
      fileId: fileRecord.id,
      uploadUrl: presignedUrl
    };
  }

  async confirmUpload(tenantId: string, fileId: string) {
    const fileRecord = await this.prisma.patientFile.findFirst({ where: { id: fileId } });
    if (!fileRecord) throw new NotFoundException('File request not found');

    // In a perfectly robust system, we would ask MinIO "statObject" to ensure the file actually arrived
    // before marking it uploaded.
    await this.minioClient.statObject(this.BUCKET, fileRecord.s3ObjectKey).catch(() => {
       throw new NotFoundException('File binary not found in storage bucket');
    });

    const updated = await this.prisma.patientFile.updateMany({
      where: { id: fileId },
      data: { status: 'UPLOADED' }
    });

    return { success: true };
  }

  async getDownloadUrl(tenantId: string, fileId: string) {
    // 1. Secure Fetch (Implicitly bounds to tenantId via ALS / findFirst)
    const fileRecord = await this.prisma.patientFile.findFirst({ 
      where: { id: fileId, status: 'UPLOADED' } 
    });
    
    if (!fileRecord) throw new NotFoundException('File not found');

    // 2. Generate Pre-Signed GET URL (Valid for 5 minutes)
    // This URL allows temporary read access to an otherwise totally private bucket.
    const presignedUrl = await this.minioClient.presignedGetObject(
      this.BUCKET,
      fileRecord.s3ObjectKey,
      5 * 60
    );

    return {
      downloadUrl: presignedUrl,
      metadata: {
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType
      }
    };
  }
}
```
*   **Purpose:** Acts as the cryptographic broker between the PostgreSQL metadata store and the MinIO binary blob store.
*   **Tenant Isolation:** The `s3ObjectKey` strictly enforces the directory structure: `${tenantId}/patients/...`. Even if a user somehow intercepted a Pre-Signed upload URL, they are physically incapable of uploading the file anywhere except within their own isolated tenant directory in the bucket.
*   **Performance:** By issuing Pre-Signed URLs, the NestJS API never touches the actual 50MB binary file. The frontend streams it directly to MinIO, drastically reducing CPU/RAM load on the Node.js server.

---

## 3. Controllers

### `src/modules/storage/controllers/storage.controller.ts`
```typescript
import { Controller, Post, Get, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { StorageService } from '../services/storage.service';
import { RequestUploadDto, ConfirmUploadDto } from '../dto/storage.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuditLoggerInterceptor } from '../../../common/interceptors/audit-logger.interceptor';

@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-request')
  @UseGuards(TenantStatusGuard) // Block suspended clinics from using storage bandwidth
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'PATIENT_FILE' })
  async requestUploadUrl(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestUploadDto) {
    return this.storageService.requestUploadUrl(user.tenantId, user.id, dto);
  }

  @Post('confirm-upload')
  @UseGuards(TenantStatusGuard)
  @RequirePermissions({ action: 'CREATE', subject: 'PATIENT_FILE' })
  async confirmUpload(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmUploadDto) {
    return this.storageService.confirmUpload(user.tenantId, dto.fileId);
  }

  @Get('files/:id/url')
  @RequirePermissions({ action: 'READ', subject: 'PATIENT_FILE' })
  @UseInterceptors(AuditLoggerInterceptor) // Audit log EVERY time an X-Ray is viewed
  async getDownloadUrl(@CurrentUser() user: AuthenticatedUser, @Param('id') fileId: string) {
    return this.storageService.getDownloadUrl(user.tenantId, fileId);
  }
}
```
*   **Purpose:** Exposes the safe URL-negotiation endpoints to the Frontend.
*   **Security & Audit:** Viewing an X-Ray or Document triggers the `AuditLoggerInterceptor`. This leaves an immutable forensic trail documenting exactly which staff member requested access to which patient's medical files, satisfying stringent HIPAA/GDPR auditing requirements.
*   **SaaS Billing:** The `upload-request` is fortified by `TenantStatusGuard`. Clinics that fail to pay their subscription are instantly blocked from uploading new X-Rays, preventing them from abusing your cloud storage costs.
