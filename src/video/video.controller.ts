import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { join } from 'path';
import { statSync, createReadStream, existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { diskStorage } from 'multer';

@Controller('video')
export class VideoController {
  constructor(
    @Inject(VideoService)
    private readonly videoService: VideoService,
  ) {}
  @Get('/streaming/:target')
  async getStreamOrFile(@Param('target') target: string, @Res() res: Response) {
    let filePath: string;
    try {
      if (/^\d+$/.test(target)) {
        // 숫자만 오면 m3u8 반환
        const video = await this.videoService.getVideoById(Number(target));
        if (!video) {
          return res.status(404).send('Video not found');
        }
        filePath = video.m3u8Path;
        res.setHeader('Content-Type', 'application/x-mpegURL');
      } else {
        // 파일명이 오면 해당 파일 반환 (예: 10_0.ts)
        // 파일명에서 id 추출 (예: 10_0.ts → 10)
        const id = target.split('_')[0].split('.')[0];
        filePath = join('/app/uploads/media', id, target);
        res.setHeader('Content-Type', 'application/octet-stream');
      }

      // 파일 존재 여부 체크
      if (!existsSync(filePath)) {
        return res.status(404).send('File not found');
      }

      const stat = statSync(filePath);
      res.setHeader('Content-Length', stat.size);
      createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error(err);
      res.status(500).send((err as Error).message);
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dest = join('/app/uploads/media');
          if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
          }
          cb(null, dest);
        },
        filename: (_req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description: string,
    @Res() res: Response,
  ) {
    try {
      await this.videoService.handleUpload(file, title, description);
      res.status(200).json({ success: true });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }
}
