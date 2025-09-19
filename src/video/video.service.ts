import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './video.entity';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

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
      console.error('Error getting video by ID:', error);
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
