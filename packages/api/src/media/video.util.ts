import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

export interface VideoProcessOutput {
  posterPath: string; // absolute fs path
  transcodedPath: string; // absolute fs path
  width: number;
  height: number;
  durationSec: number;
}

export function probeVideo(fsPath: string): Promise<{
  width: number;
  height: number;
  durationSec: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(fsPath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find((s) => s.codec_type === 'video');
      resolve({
        width: stream?.width ?? 0,
        height: stream?.height ?? 0,
        durationSec: Math.round(Number(data.format.duration) || 0),
      });
    });
  });
}

export async function transcodeToMp4720p(inputPath: string, outputPath: string): Promise<void> {
  await fs.mkdir(dirname(outputPath), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-vf scale=trunc(oh*a/2)*2:720',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

export async function extractPoster(inputPath: string, outputPath: string): Promise<void> {
  await fs.mkdir(dirname(outputPath), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .screenshots({
        timestamps: ['00:00:01.000'],
        filename: outputPath.split('/').pop()!,
        folder: dirname(outputPath),
        size: '1280x?',
      });
  });
}
