import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { loadEnv } from '../../config/env';

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (_connection) return _connection;
  const env = loadEnv();
  _connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // BullMQ requirement
  });
  return _connection;
}

export const MEDIA_QUEUE_NAME = 'media-processing';

export function createMediaQueue(): Queue {
  return new Queue(MEDIA_QUEUE_NAME, { connection: getRedisConnection() });
}

export interface VideoJobData {
  mediaId: string;
  originalFsPath: string;
}
