import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MinioService } from '../services/minio.service';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';

@Controller('storage')
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
export class StorageController {
  constructor(private readonly minioService: MinioService) {}

  @Get('upload-url')
  async getUploadUrl(@Query('filename') filename: string) {
    return { url: await this.minioService.generatePresignedUrl('x-rays', filename) };
  }
}
