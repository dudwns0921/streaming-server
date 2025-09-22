import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './video.entity';
import { join } from 'path';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

  async handleUpload(
    file: Express.Multer.File,
    title: string,
    description: string,
  ): Promise<void> {
    // 최신 id 조회 및 폴더 생성
    const latestId = (await this.getLatestId()) ?? 1;
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
        throw new InternalServerErrorException('ffmpeg processing error');
      }
      this.createVideo(
        title,
        description,
        `/app/uploads/media/${latestId}/${latestId}.m3u8`,
        `/app/uploads/media/${latestId}/${latestId}_0.ts`,
        `/app/uploads/media/${latestId}/${latestId}_1.ts`,
        `/app/uploads/media/${latestId}/${latestId}_2.ts`,
      ).catch((err) => {
        throw new InternalServerErrorException((err as Error).message);
      });
    });
  }

  async getLatestId(): Promise<number | null> {
    try {
      const result: { max: number | null } = (await this.videoRepository
        .createQueryBuilder('video')
        .select('MAX(video.id)', 'max')
        .getRawOne()) ?? { max: null };

      console.log('Latest video ID result:', result);
      return result.max ? Number(result.max) + 1 : null;
    } catch (error) {
      console.error('Error getting latest video ID:', error);
      throw new InternalServerErrorException(error);
    }
  }

  async getVideoById(id: number): Promise<Video | null> {
    try {
      return await this.videoRepository.findOneBy({ id });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async createVideo(
    title: string,
    description: string,
    m3u8Path: string,
    ts0Path: string,
    ts1Path: string,
    ts2Path: string,
  ): Promise<Video> {
    try {
      console.log('Creating video with paths:', {
        m3u8Path,
        ts0Path,
        ts1Path,
        ts2Path,
      });
      const video = this.videoRepository.create({
        title,
        description,
        m3u8Path,
        ts0Path,
        ts1Path,
        ts2Path,
      });
      return this.videoRepository.save(video);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
