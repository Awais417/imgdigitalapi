import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ImageModule } from './image/image.module';
import { PdfModule } from './pdf/pdf.module';
import { DestroyModule } from './destroy/destroy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ImageModule,
    PdfModule,
    DestroyModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
