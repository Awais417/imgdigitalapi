import { Module } from '@nestjs/common';
import { ConversionsModule } from '../conversions/conversions.module';
import { S3Module } from '../s3/s3.module';
import { AuthModule } from '../auth/auth.module';
import { ConversionTrackingMiddleware } from './conversion-tracking.middleware';

@Module({
  imports: [ConversionsModule, S3Module, AuthModule],
  providers: [ConversionTrackingMiddleware],
  exports: [ConversionTrackingMiddleware],
})
export class ConversionTrackingModule {}
