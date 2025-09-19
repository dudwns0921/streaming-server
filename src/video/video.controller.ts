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
import {
  statSync,
  createReadStream,
  existsSync,
  mkdirSync,
  renameSync,
} from 'fs';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
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
      console.log('Requested target:', target);
      const id = target.split('_')[0].split('.')[0];
      filePath = join('/app/uploads/media', id, target);
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    try {
      const stat = statSync(filePath);
      res.setHeader('Content-Length', stat.size);
      createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error('File not found:', err);
      res.status(404).send('File not found');
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
    // 최신 id 조회 및 폴더 생성
    const latestId = (await this.videoService.getLatestId()) ?? 1;
    const targetDir = join('/app/uploads/media', latestId.toString());
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = join(targetDir, file.originalname);

    // 원본 mp4 파일을 최신 id 폴더로 이동
    renameSync(file.path, targetPath);

    const outputPath = join(targetDir, `${latestId}.m3u8`);

    // ffmpeg 명령어 실행 (원본 mp4 경로를 targetPath로 변경)
    const ffmpeg: ChildProcessWithoutNullStreams = spawn('ffmpeg', [
      '-i',
      targetPath,
      '-codec:',
      'copy',
      '-start_number',
      '0',
      '-hls_time',
      '10',
      '-hls_list_size',
      '0',
      '-hls_segment_filename',
      `${targetDir}/${latestId}_%d.ts`,
      '-f',
      'hls',
      outputPath,
    ]);

    ffmpeg.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error(`ffmpeg process exited with code ${code}`);
        return res
          .status(500)
          .json({ success: false, message: 'Transcoding failed' });
      }
      this.videoService
        .createVideo(
          title,
          description,
          `/app/uploads/media/${latestId}/${latestId}.m3u8`,
          `/app/uploads/media/${latestId}/${latestId}_0.ts`,
          `/app/uploads/media/${latestId}/${latestId}_1.ts`,
          `/app/uploads/media/${latestId}/${latestId}_2.ts`,
        )
        .then(() => {
          res.status(200).json({ success: true });
        })
        .catch((err) => {
          res
            .status(500)
            .json({ success: false, message: 'Database error', error: err });
        });
    });
  }
}
