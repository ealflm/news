import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import { promises as fs, createWriteStream } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { loadEnv } from '../../config/env';
import type { StorageProvider, StoredFile } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;
  private readonly prefix: string;

  constructor() {
    const env = loadEnv();
    this.root = resolve(env.UPLOADS_DIR);
    this.prefix = env.PUBLIC_UPLOADS_PREFIX.replace(/\/$/, '');
  }

  private joinPublic(category: string, filename: string): string {
    return `${this.prefix}/${category}/${filename}`.replace(/\\+/g, '/');
  }

  async saveBuffer(category: string, filename: string, data: Buffer): Promise<StoredFile> {
    const fsPath = join(this.root, category, filename);
    await fs.mkdir(dirname(fsPath), { recursive: true });
    await fs.writeFile(fsPath, data);
    return { publicPath: this.joinPublic(category, filename), size: data.byteLength };
  }

  async saveStream(category: string, filename: string, stream: Readable): Promise<StoredFile> {
    const fsPath = join(this.root, category, filename);
    await fs.mkdir(dirname(fsPath), { recursive: true });
    await pipeline(stream, createWriteStream(fsPath));
    const stat = await fs.stat(fsPath);
    return { publicPath: this.joinPublic(category, filename), size: stat.size };
  }

  async delete(publicPath: string): Promise<void> {
    if (!publicPath.startsWith(this.prefix + '/')) return;
    const rel = publicPath.slice(this.prefix.length + 1);
    const fsPath = resolve(this.root, rel);
    if (!fsPath.startsWith(this.root + sep)) return;
    await fs.rm(fsPath, { force: true, recursive: true });
  }

  resolveFsPath(publicPath: string): string {
    const rel = publicPath.startsWith(this.prefix + '/')
      ? publicPath.slice(this.prefix.length + 1)
      : publicPath;
    return resolve(this.root, rel);
  }
}
