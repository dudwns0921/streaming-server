import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  m3u8Path: string;

  @Column()
  ts0Path: string;

  @Column()
  ts1Path: string;

  @Column()
  ts2Path: string;
}
