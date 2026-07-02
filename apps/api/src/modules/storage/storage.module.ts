import { Module } from '@nestjs/common';
import { StorageController } from './controllers/storage.controller';
import { MinioService } from './services/minio.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [StorageController],
  providers: [MinioService],
  exports: [MinioService],
})
export class StorageModule {}
