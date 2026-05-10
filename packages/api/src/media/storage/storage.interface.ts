import { Readable } from 'node:stream';

export interface StoredFile {
  publicPath: string;
  size: number;
}

export interface StorageProvider {
  saveBuffer(category: string, filename: string, data: Buffer): Promise<StoredFile>;
  saveStream(category: string, filename: string, stream: Readable): Promise<StoredFile>;
  delete(publicPath: string): Promise<void>;
  resolveFsPath(publicPath: string): string;
}
