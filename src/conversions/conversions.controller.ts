import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConversionsService } from './conversions.service';
import { S3Service } from '../s3/s3.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface MFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('conversions')
@UseGuards(JwtAuthGuard)
export class ConversionsController {
  constructor(
    private readonly conversionsService: ConversionsService,
    private readonly s3Service: S3Service,
  ) {}

  /** Save a processed file to S3 + DB */
  @Post('save')
  @UseInterceptors(FileInterceptor('file'))
  async saveConversion(
    @UploadedFile() file: MFile,
    @Body() body: { toolSlug: string; originalFileName?: string; outputFileName?: string },
    @Request() req: any,
  ) {
    const userId: number = req.user.userId;
    const toolSlug = body.toolSlug ?? 'unknown';
    const outputFileName = body.outputFileName ?? file.originalname ?? `${toolSlug}-output`;
    const originalFileName = body.originalFileName ?? '';

    const s3Key = `conversions/${userId}/${Date.now()}-${outputFileName}`;
    const s3Url = await this.s3Service.upload(file.buffer, s3Key, file.mimetype);

    const record = await this.conversionsService.save({
      userId,
      toolSlug,
      originalFileName,
      outputFileName,
      s3Key,
      s3Url,
      fileSize: file.size,
    });

    return {
      id: record.id,
      toolSlug: record.toolSlug,
      originalFileName: record.originalFileName,
      outputFileName: record.outputFileName,
      fileSize: Number(record.fileSize),
      createdAt: record.createdAt,
      downloadUrl: await this.s3Service.getPresignedUrl(s3Key),
    };
  }

  @Get()
  async getMyConversions(@Request() req: any) {
    const records = await this.conversionsService.findByUser(req.user.userId);
    return Promise.all(
      records.map(async (r) => ({
        id: r.id,
        toolSlug: r.toolSlug,
        originalFileName: r.originalFileName,
        outputFileName: r.outputFileName,
        fileSize: Number(r.fileSize),
        createdAt: r.createdAt,
        downloadUrl: r.s3Key ? await this.s3Service.getPresignedUrl(r.s3Key) : null,
      })),
    );
  }

  @Delete(':id')
  async deleteConversion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    await this.conversionsService.deleteById(id, req.user.userId);
    return { success: true };
  }
}
