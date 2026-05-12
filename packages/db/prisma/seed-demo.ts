/**
 * Demo data seeder — populates the production DB with N news articles and
 * realistic view/click traffic so the analytics dashboard renders charts
 * with non-empty data.
 *
 * Idempotent: re-running upserts posts by slug (slug = `demo-<n>`) and adds
 * a *fresh* batch of view/click events each run. To reset analytics counts,
 * truncate ViewEvent/ClickEvent first.
 *
 * Env:
 *   POSTS_COUNT       number of posts to create (default 30)
 *   VIEWS_PER_POST    avg view events per post (default 80, jittered ±50%)
 *   WINDOW_DAYS       spread events across the last N days (default 30)
 *
 * Run from /repo/packages/db inside the migrate container:
 *
 *   docker compose run --rm \
 *     -e POSTS_COUNT=30 -e VIEWS_PER_POST=80 -e WINDOW_DAYS=30 \
 *     migrate node_modules/.bin/tsx prisma/seed-demo.ts
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const POSTS_COUNT = Number(process.env.POSTS_COUNT ?? 30);
const VIEWS_PER_POST = Number(process.env.VIEWS_PER_POST ?? 80);
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 30);

const TITLES = [
  'Sale 5.5 Shopee: Cách săn voucher giảm 50% đầu tháng',
  'TikTok Shop tung chương trình hoàn tiền 30% cho tài khoản mới',
  '10 mẫu áo thun unisex bán chạy nhất Lazada tuần này',
  'Săn iPhone 16 Pro Max giá thấp nhất ở đâu? So sánh 3 sàn lớn',
  'Bí quyết chọn nồi chiên không dầu: 5 dòng đáng mua nhất 2026',
  'Review chân thực Galaxy S25 Ultra sau 2 tuần dùng hằng ngày',
  'Top 7 deal laptop văn phòng dưới 15 triệu trên Shopee',
  'Cẩm nang mua điện thoại trả góp không lãi suất tháng 5',
  'Cách phân biệt mỹ phẩm chính hãng và hàng nhái trên TikTok Shop',
  'Vì sao giá tai nghe true wireless đang giảm mạnh ở Việt Nam?',
  'Tổng hợp deal Flash Sale 12.5 — link mua nhanh trong 1 click',
  'Hướng dẫn săn hoàn xu Shopee tối đa cho người mới',
  'Top 5 robot hút bụi đáng tiền nhất 2026',
  'Camera hành trình ô tô: 4 mẫu vừa rẻ vừa bền',
  'Đánh giá Macbook Air M4: có nên nâng cấp từ M2?',
  'Cách kiểm tra hàng chính hãng trên Lazada qua mã vạch',
  'Cộng đồng review: tai nghe nào dưới 1 triệu nghe nhạc hay nhất?',
  'Bí kíp săn voucher Grab + ShopeeFood giảm 40k mỗi đơn',
  'Đập hộp PS5 Slim mua từ TikTok Shop — có thật không?',
  'Top 6 ấm đun nước siêu tốc tiết kiệm điện đáng mua',
  'Tủ lạnh inverter bán chạy nhất Lazada quý 2',
  'Phân biệt Airpods 4 thật và fake: 3 dấu hiệu nhận biết',
  'Loa di động dưới 2 triệu: 5 mẫu pin lâu nhất hiện nay',
  'Tăng cường bảo mật tài khoản Shopee sau đợt rò rỉ tháng 4',
  'Mua máy lọc không khí mùa hè: cần lưu ý gì?',
  'Top 4 bếp từ đôi đang flash sale dưới 5 triệu',
  'Đánh giá đồng hồ Apple Watch SE — đáng mua nhất tầm giá?',
  'Quà tặng sinh nhật bạn gái: 8 ý tưởng dưới 1 triệu',
  'Top 5 chảo chống dính dùng được trên bếp từ',
  'Hướng dẫn mở affiliate Shopee: từ A-Z trong 10 phút',
  'Khuyến mãi flash sale 8.5: deal nào đáng săn?',
  'So sánh Tiki, Shopee, Lazada: sàn nào ship nhanh nhất ở TP.HCM?',
];

const EXCERPTS = [
  'Tổng hợp deal hot, cách săn voucher và mẹo mua sắm thông minh đầu tháng.',
  'Cập nhật mới nhất từ các sàn TMĐT — đừng bỏ lỡ cơ hội tiết kiệm.',
  'Hướng dẫn chi tiết kèm link mua nhanh, áp dụng được ngay hôm nay.',
  'Phân tích sâu, so sánh nhiều mẫu, có ưu nhược điểm rõ ràng.',
  'Review chân thực sau thời gian sử dụng dài hạn, không quảng cáo.',
];

const DEVICES = ['ios', 'android', 'desktop', 'unknown'] as const;
const REFERRERS = [
  'https://www.google.com/',
  'https://www.facebook.com/',
  'https://m.facebook.com/',
  'https://www.tiktok.com/',
  'https://l.facebook.com/l.php?u=...',
  '',
  'https://news.google.com/',
  '',
  '',
  'https://tinsoc.click/',
];

function jitter(base: number, ratio = 0.5): number {
  const delta = base * ratio;
  return Math.max(1, Math.round(base + (Math.random() * 2 - 1) * delta));
}

function pick<T>(arr: readonly T[]): T {
  const v = arr[Math.floor(Math.random() * arr.length)];
  return v as T;
}

function randomPastDate(maxDaysAgo: number): Date {
  const now = Date.now();
  const offsetMs = Math.random() * maxDaysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offsetMs);
}

function buildContentHtml(title: string, excerpt: string): string {
  const paragraphs = [
    `<p>${excerpt}</p>`,
    `<p>Trong bài viết này, chúng tôi sẽ phân tích kỹ ${title.toLowerCase()}, đồng thời cung cấp các link mua nhanh tới sản phẩm trên 3 sàn lớn nhất Việt Nam: Shopee, TikTok Shop và Lazada.</p>`,
    `<h2>Vì sao chủ đề này được quan tâm</h2>`,
    `<p>Người tiêu dùng đang ngày càng kỹ tính khi chọn mua online. Theo khảo sát gần đây, hơn 70% người Việt từng mua hàng trên TMĐT trong 6 tháng qua.</p>`,
    `<h2>Các điểm cần lưu ý</h2>`,
    `<ul><li>Kiểm tra đánh giá người mua trước đó</li><li>So sánh giá giữa các sàn để tránh mua hớ</li><li>Tận dụng voucher hoàn xu và mã giảm giá</li></ul>`,
    `<h2>Kết luận</h2>`,
    `<p>Với những gợi ý ở trên, hy vọng bạn sẽ có lựa chọn tối ưu và tiết kiệm được nhiều nhất.</p>`,
  ];
  return paragraphs.join('\n');
}

function buildContentJson(html: string): unknown {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: html.slice(0, 200) }] }],
  };
}

async function ensureAuthor(): Promise<string> {
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u) throw new Error(`Author user "@${username}" not found — run seed.ts first.`);
  return u.id;
}

async function main() {
  console.log(
    `Seeding ${POSTS_COUNT} posts + ~${VIEWS_PER_POST} views/post over the last ${WINDOW_DAYS} days…`,
  );
  const authorId = await ensureAuthor();

  for (let i = 1; i <= POSTS_COUNT; i++) {
    const title = TITLES[(i - 1) % TITLES.length] ?? `Demo post ${i}`;
    const slug = `demo-${i}`;
    const excerpt = pick(EXCERPTS);
    const contentHtml = buildContentHtml(title, excerpt);
    const publishedAt = randomPastDate(WINDOW_DAYS);

    const post = await prisma.post.upsert({
      where: { slug },
      update: {
        title,
        excerpt,
        contentHtml,
        contentJson: buildContentJson(contentHtml) as never,
        publishedAt,
        status: 'PUBLISHED',
      },
      create: {
        slug,
        title,
        excerpt,
        contentHtml,
        contentJson: buildContentJson(contentHtml) as never,
        publishedAt,
        status: 'PUBLISHED',
        authorId,
      },
    });

    const viewsToCreate = jitter(VIEWS_PER_POST, 0.5);
    const viewRows = Array.from({ length: viewsToCreate }, () => ({
      postId: post.id,
      sessionId: `s_${Math.random().toString(36).slice(2, 10)}`,
      device: pick(DEVICES),
      inFbApp: Math.random() < 0.15,
      referrer: pick(REFERRERS) || null,
      createdAt: randomPastDate(WINDOW_DAYS),
    }));

    if (viewRows.length > 0) {
      await prisma.viewEvent.createMany({ data: viewRows });
      await prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: viewRows.length } },
      });
    }
    process.stdout.write(`  [${i}/${POSTS_COUNT}] ${slug} (+${viewRows.length} views)\n`);
  }

  // Clicks for the first active popup if any
  const popup = await prisma.popup.findFirst({ where: { enabled: true } });
  if (popup) {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true },
      take: POSTS_COUNT,
    });
    const totalClicks = jitter(POSTS_COUNT * 8, 0.5);
    const clickRows = Array.from({ length: totalClicks }, () => ({
      popupId: popup.id,
      postId: pick(posts).id,
      device: pick(DEVICES),
      trigger: Math.random() < 0.7 ? 'image' : 'close',
      sessionId: `s_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: randomPastDate(WINDOW_DAYS),
    }));
    await prisma.clickEvent.createMany({ data: clickRows });
    console.log(`  +${clickRows.length} click events for popup "${popup.name}"`);
  } else {
    console.log('  No enabled popup found — skipping click events.');
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
