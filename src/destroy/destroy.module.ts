import { Module } from '@nestjs/common';
import { DestroyController } from './destroy.controller';

@Module({
  controllers: [DestroyController],
})
export class DestroyModule {}
