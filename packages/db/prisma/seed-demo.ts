/**
 * Demo data seeder — populates the production DB with 20 Vietnamese
 * news/drama articles + realistic view/click traffic so the analytics
 * dashboard renders charts with non-empty data.
 *
 * Articles are mirrored from scripts/seed-articles.py (titles, excerpts,
 * 3-paragraph bodies, image_count, youtube/video flags). Unlike the Python
 * version which goes through the live API + ffmpeg, this script writes
 * directly to Prisma and references public picsum / Google sample-bucket
 * URLs for media (no uploads, no ffmpeg needed).
 *
 * Idempotent: upserts posts by slug (`demo-<n>`); re-running ADDS a fresh
 * batch of view/click events. To reset analytics counts, truncate
 * ViewEvent/ClickEvent first.
 *
 * Env:
 *   POSTS_COUNT       number of posts to create (default 20, max 20 unique;
 *                     >20 cycles through the article list with new slugs)
 *   VIEWS_PER_POST    avg view events per post (default 80, jittered ±50%)
 *   WINDOW_DAYS       spread events across the last N days (default 30)
 *
 *   docker compose run --rm \
 *     -e SEED_ADMIN_USERNAME \
 *     -e POSTS_COUNT=20 -e VIEWS_PER_POST=80 -e WINDOW_DAYS=30 \
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

const POSTS_COUNT = Number(process.env.POSTS_COUNT ?? 20);
const VIEWS_PER_POST = Number(process.env.VIEWS_PER_POST ?? 80);
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 30);

interface DemoArticle {
  title: string;
  excerpt: string;
  paragraphs: [string, string, string];
  imageCount: 2 | 3;
  youtube: boolean;
  video?: boolean;
}

// Mirrored from scripts/seed-articles.py (20 articles).
const ARTICLES: DemoArticle[] = [
  {
    title: 'Sốc: Cặp đôi nổi tiếng V và Y bất ngờ tuyên bố chia tay sau 5 năm bên nhau',
    excerpt:
      'Tin sốc lan truyền khắp MXH tối qua khi cặp đôi vàng V và Y chính thức xác nhận đường ai nấy đi sau hơn 5 năm bền chặt.',
    imageCount: 2,
    youtube: true,
    paragraphs: [
      'Tối ngày hôm qua, cộng đồng mạng đồng loạt sốc khi cặp đôi vàng của showbiz Việt — anh V và chị Y — bất ngờ tuyên bố chính thức chia tay sau 5 năm bên nhau. Cả hai từng là biểu tượng tình yêu của giới trẻ với hàng loạt khoảnh khắc ngọt ngào trên Instagram.',
      'Theo một nguồn tin thân cận tiết lộ, hai người đã có những bất đồng khó hàn gắn trong 6 tháng qua. Lịch trình bận rộn cùng áp lực từ truyền thông được cho là nguyên nhân chính khiến mối quan hệ rạn nứt. Fan club của cả hai phía đã không kịp định thần khi nhận được thông tin này.',
      'Đại diện của cả hai phía đã chính thức xác nhận thông tin và đề nghị mọi người tôn trọng quyết định cá nhân. Họ cũng cảm ơn fan đã đồng hành suốt thời gian qua và hứa sẽ tiếp tục cống hiến hết mình cho sự nghiệp riêng.',
    ],
  },
  {
    title: 'TOP 10 voucher Shopee giảm sốc tháng 5 — không thể bỏ lỡ',
    excerpt:
      'Tổng hợp 10 mã giảm giá hot nhất Shopee tháng này, có mã giảm tới 500K cho đơn từ 1 triệu — săn ngay kẻo hết!',
    imageCount: 3,
    youtube: false,
    paragraphs: [
      'Tháng 5 này, Shopee tung loạt voucher giảm giá khủng dành cho khách hàng VIP và người mua sắm thường xuyên. Đây là cơ hội vàng để săn hàng giá rẻ trước mùa cao điểm hè.',
      'Đặc biệt, có 3 mã giảm tới 500.000đ cho đơn từ 1 triệu, áp dụng cho gian hàng Shopee Mall. Người dùng cần lưu ý thời gian áp dụng và số lượng voucher có hạn.',
      'Bí kíp để săn voucher hiệu quả: bật thông báo từ ứng dụng Shopee, đăng nhập vào khung giờ 9h, 12h và 21h hàng ngày. Đặt sẵn giỏ hàng và sẵn sàng nhấn checkout ngay khi voucher mở.',
    ],
  },
  {
    title: 'Clip 2 cô gái quẩy zay ở ngã 3 Eakao gây bão MXH',
    excerpt:
      'Một đoạn clip ngắn quay tại ngã 3 Eakao thu hút hàng triệu lượt xem chỉ sau 24h. Cộng đồng mạng bàn tán không ngớt.',
    imageCount: 2,
    youtube: true,
    video: true,
    paragraphs: [
      'Clip ghi lại cảnh hai cô gái nhảy theo điệu nhạc trẻ trung ngay tại ngã 3 Eakao đã làm dậy sóng cộng đồng mạng. Đoạn video chỉ dài 15 giây nhưng nhanh chóng đạt hơn 2 triệu lượt xem.',
      'Nhiều người dùng TikTok và Facebook đã chia sẻ lại clip với loạt bình luận hài hước. Có ý kiến khen ngợi sự tự tin của hai bạn trẻ, cũng có ý kiến trái chiều về việc nhảy ở nơi công cộng.',
      'Hiện danh tính của hai cô gái vẫn chưa được tiết lộ. Cộng đồng mạng đang tích cực truy tìm thông tin để liên hệ.',
    ],
  },
  {
    title: 'Đánh giá iPhone 17 Pro Max sau 1 tháng sử dụng: liệu có đáng nâng cấp?',
    excerpt:
      'Sau 30 ngày trải nghiệm thực tế iPhone 17 Pro Max, đây là những điểm cộng và điểm trừ bạn cần biết trước khi xuống tiền.',
    imageCount: 3,
    youtube: true,
    paragraphs: [
      'iPhone 17 Pro Max ra mắt giữa tháng 4 với hàng loạt nâng cấp đáng giá. Sau 1 tháng sử dụng làm máy chính, tôi xin chia sẻ những trải nghiệm chân thực nhất về siêu phẩm này.',
      'Điểm cộng lớn nhất là camera 48MP cải tiến cho ảnh thiếu sáng xuất sắc, pin trâu hơn 20% so với thế hệ trước. Chip A19 Pro mạnh mẽ xử lý mọi tác vụ mượt mà từ chỉnh sửa video 4K đến chơi game đồ họa nặng.',
      'Tuy nhiên, giá bán khởi điểm từ 35 triệu đồng vẫn là rào cản lớn. Trọng lượng máy nặng hơn, sử dụng lâu dễ mỏi tay khi cầm. Nếu đang dùng iPhone 15 Pro, mình khuyên không nhất thiết phải nâng cấp ngay.',
    ],
  },
  {
    title: 'Nữ ca sĩ X bất ngờ lộ clip nóng, fan đồng loạt tẩy chay',
    excerpt:
      'Một đoạn clip nhạy cảm của nữ ca sĩ X bị phát tán trên mạng, gây tranh cãi dữ dội trong cộng đồng fan và truyền thông.',
    imageCount: 2,
    youtube: false,
    paragraphs: [
      'Vào sáng nay, một đoạn clip nhạy cảm được cho là của nữ ca sĩ trẻ X đã bị phát tán rộng rãi trên các diễn đàn. Sự việc nhanh chóng leo lên top tìm kiếm trên các nền tảng MXH Việt Nam.',
      'Đại diện của ca sĩ X đã lên tiếng phủ nhận, khẳng định clip là sản phẩm cắt ghép bằng AI. Tuy nhiên, nhiều fan kỳ cựu đã tuyên bố quay lưng và rời khỏi cộng đồng người hâm mộ.',
      'Vụ việc tiếp tục đặt ra câu hỏi về vấn đề deepfake và quyền riêng tư của người nổi tiếng trong thời đại AI phát triển nhanh chóng.',
    ],
  },
  {
    title: 'Bí kíp săn hàng Lazada sale 5.5 — giảm tới 70% cho khách mới',
    excerpt:
      'Sự kiện Lazada Birthday 5.5 trở lại với hàng nghìn deal hấp dẫn. Bài viết chia sẻ chiến thuật săn deal hiệu quả nhất.',
    imageCount: 2,
    youtube: true,
    paragraphs: [
      'Lazada chính thức khởi động sự kiện sinh nhật 5.5 từ 0h ngày 5/5, kéo dài đến hết 7/5. Đây là dịp lớn nhất trong tháng với hàng nghìn deal giảm tới 70% và freeship toàn quốc.',
      'Chiến thuật săn deal hiệu quả: đăng ký Lazada Bonus, mở app vào 0h, 12h và 21h để gom xu, tham gia mini game để nhận voucher độc quyền. Khách hàng mới còn được tặng mã giảm 100K không điều kiện.',
      'Lưu ý: nhiều deal flash sale chỉ kéo dài 1 phút, hãy đặt sẵn sản phẩm yêu thích vào giỏ và sẵn sàng checkout. Combo voucher + xu có thể giúp tiết kiệm tới 40% so với giá niêm yết.',
    ],
  },
  {
    title: 'MC nổi tiếng bị BTV cũ tố quỵt lương 6 tháng, lộ tin nhắn đòi nợ',
    excerpt:
      'Drama mới nhất trong giới truyền hình: MC kỳ cựu bị tố quỵt lương BTV cũ tới 6 tháng, các tin nhắn đòi nợ bị tung lên MXH.',
    imageCount: 2,
    youtube: false,
    paragraphs: [
      'Câu chuyện gây xôn xao giới truyền hình tuần qua khi một BTV trẻ đã đăng đàn tố cáo MC nổi tiếng quỵt lương suốt 6 tháng làm việc. Tin nhắn đòi nợ kèm chứng từ chuyển khoản được công bố công khai.',
      'MC bị tố tên viết tắt là H., hiện đang dẫn một chương trình giải trí hàng đầu. Phản hồi đầu tiên từ phía MC chỉ là một dòng status mơ hồ trên Facebook cá nhân khiến cộng đồng càng dậy sóng.',
      "Cộng đồng mạng đang chia làm hai phe: một bên ủng hộ BTV trẻ dũng cảm lên tiếng, một bên cho rằng nên giải quyết riêng thay vì 'đem chuyện ra MXH'.",
    ],
  },
  {
    title: 'Hoa hậu Z bị bóc phốt mua giải, BTC chính thức lên tiếng',
    excerpt:
      'Hoa hậu Z vừa đăng quang đã bị một thí sinh khác bóc phốt mua giải trị giá 5 tỷ. Ban tổ chức buộc phải lên tiếng giải thích.',
    imageCount: 2,
    youtube: true,
    paragraphs: [
      'Cuộc thi nhan sắc tổ chức tháng 4 vừa qua đang gặp scandal lớn khi một thí sinh top 5 đăng status tố cáo Hoa hậu Z đã chi 5 tỷ đồng để mua giải. Bài viết kèm theo các bằng chứng giao dịch chuyển khoản và tin nhắn nội bộ.',
      'Ban tổ chức ngay lập tức lên tiếng phủ nhận, khẳng định kết quả là khách quan dựa trên điểm số tổng hợp từ ba vòng thi. Họ cũng đe dọa kiện ngược thí sinh tố cáo nếu không cung cấp bằng chứng cụ thể.',
      'Hoa hậu Z chưa có phản hồi chính thức nào ngoài việc đóng comment trên toàn bộ bài đăng Instagram. Người hâm mộ chia thành hai phe rõ rệt.',
    ],
  },
  {
    title: 'TikTok Shop tung mã giảm freeship toàn quốc nhân dịp 5.5',
    excerpt:
      'Cuối tuần này, TikTok Shop chạy chương trình freeship toàn quốc kèm voucher giảm 30% cho đơn từ 99K. Mua ngay kẻo lỡ!',
    imageCount: 2,
    youtube: true,
    paragraphs: [
      'TikTok Shop chính thức công bố chương trình khuyến mãi lớn nhân dịp 5.5 với mã giảm freeship toàn quốc và voucher 30% cho đơn từ 99.000đ. Chương trình kéo dài 3 ngày từ 5/5 đến 7/5.',
      'Đặc biệt, các shop hot trên TikTok còn tung ra livestream với deal chỉ có trong khung giờ vàng. Người mua có thể đặt được giá rẻ hơn 50% so với các sàn TMĐT khác.',
      'Lưu ý: TikTok Shop hiện chỉ hỗ trợ thanh toán qua MoMo, ZaloPay, ngân hàng nội địa và COD. Khi gặp vấn đề về đơn hàng, người dùng liên hệ trực tiếp với shop qua tin nhắn riêng tư.',
    ],
  },
  {
    title: "L'Oreal Watergel UV Defender — review chi tiết sau 2 tuần sử dụng",
    excerpt:
      'Kem chống nắng đang gây sốt MXH với khả năng chống tia UV mạnh mẽ và không gây nhờn. Liệu có xứng đáng với giá hơn 400K?',
    imageCount: 3,
    youtube: false,
    paragraphs: [
      "L'Oreal Watergel UV Defender là một trong những sản phẩm chống nắng hot nhất tháng 5, được nhiều beauty blogger Việt khen ngợi không tiếc lời. Vậy thực tế chất lượng có như quảng cáo?",
      'Sau 2 tuần sử dụng liên tục, tôi nhận thấy kem thấm rất nhanh, không để lại vệt trắng và đặc biệt không gây bí lỗ chân lông. Chỉ số SPF50+ PA++++ đảm bảo bảo vệ da tuyệt vời dưới nắng gắt Sài Gòn.',
      'Tuy nhiên, giá hơn 400.000đ/tuýp 50ml là khá cao so với mặt bằng chung. Người da khô sẽ cần kết hợp thêm dưỡng ẩm. Nhìn chung, đây là sản phẩm đáng đầu tư nếu bạn ưu tiên chất lượng.',
    ],
  },
  {
    title: 'Cậu bé 8 tuổi nhặt được 50 triệu trả lại người mất, nhận khen từ công an',
    excerpt:
      'Câu chuyện đẹp giữa lòng thành phố: bé Nam, 8 tuổi, nhặt được túi tiền 50 triệu và mang đến công an tìm chủ nhân.',
    imageCount: 2,
    youtube: true,
    paragraphs: [
      'Câu chuyện xúc động giữa lòng thành phố khi bé Nam, học sinh lớp 3 tại quận Tân Bình, đã nhặt được một túi nylon chứa 50 triệu đồng tiền mặt. Không chút do dự, em đã chạy ngay tới đồn công an gần nhất để giao nộp.',
      'Sau khi xác minh, công an phường đã liên hệ được với chủ nhân là một tiểu thương đánh rơi trên đường đi giao hàng. Người này đã rất xúc động khi nhận lại được số tiền tích cóp suốt 6 tháng.',
      'Bé Nam được công an phường khen ngợi và tặng giấy khen. Câu chuyện được lan tỏa khắp MXH như một bài học đẹp về tính trung thực trong xã hội hiện đại.',
    ],
  },
  {
    title: 'Bà chủ quán phở Hà Nội bóc phốt khách bùng tiền — đoạn camera gây bão',
    excerpt:
      'Đoạn camera ghi lại cảnh khách ăn xong rồi vọt mất không trả tiền tại quán phở nổi tiếng Hà Nội đang gây xôn xao MXH.',
    imageCount: 2,
    youtube: false,
    video: true,
    paragraphs: [
      'Tối ngày 3/5, một quán phở nổi tiếng tại phố cổ Hà Nội đã đăng tải đoạn camera ghi lại cảnh nhóm 4 khách trẻ ăn xong rồi nhanh chóng rời quán mà không thanh toán. Tổng hóa đơn lên tới 850.000đ.',
      'Bà chủ quán bức xúc cho biết đây không phải lần đầu xảy ra tình trạng này, nhưng đây là lần đầu tiên có camera ghi lại rõ mặt. Cộng đồng mạng nhanh chóng truy tìm thông tin của nhóm khách này.',
      'Hiện công an phường đang vào cuộc xác minh. Nhiều người dùng MXH đã đề nghị quán phở chính thức nộp đơn tố cáo để răn đe những hành vi tương tự.',
    ],
  },
  {
    title: 'Học sinh đánh nhau tại cổng trường — clip viral khắp MXH',
    excerpt:
      'Đoạn clip ghi lại cảnh hai học sinh THCS đánh nhau dữ dội ngay cổng trường khiến phụ huynh và nhà trường vào cuộc.',
    imageCount: 2,
    youtube: true,
    paragraphs: [
      "Sự việc đáng buồn xảy ra chiều ngày 2/5 tại cổng trường THCS X. Hai học sinh lớp 8 đã có mâu thuẫn từ trước và quyết định 'giải quyết' ngay cổng trường sau giờ tan học.",
      'Đoạn clip do bạn học cùng quay lại đã nhanh chóng lan truyền trên TikTok và Facebook. Nhà trường ngay lập tức tổ chức cuộc họp khẩn với phụ huynh hai bên để xử lý vụ việc.',
      'Hai học sinh đã bị tạm đình chỉ học một tuần và phải tham gia chương trình giáo dục kỹ năng sống. Vụ việc đặt ra cảnh báo về tình trạng bạo lực học đường ngày càng phức tạp.',
    ],
  },
  {
    title: 'Apple Vision Pro 2 ra mắt 2026 — có gì mới đáng mong đợi?',
    excerpt:
      'Apple chính thức xác nhận sẽ ra mắt Vision Pro 2 vào quý 4/2026 với loạt nâng cấp đáng giá về camera, pin và giá bán.',
    imageCount: 3,
    youtube: true,
    paragraphs: [
      'Trong sự kiện Spring Event vừa diễn ra, Apple đã chính thức xác nhận sẽ ra mắt Vision Pro thế hệ 2 vào quý 4 năm 2026. Đây là nâng cấp lớn sau hơn 2 năm kể từ thế hệ đầu tiên.',
      'Vision Pro 2 sẽ có camera depth-sensing cải tiến, thời lượng pin lên tới 4 giờ sử dụng liên tục và đặc biệt là giá bán dự kiến giảm 30% so với phiên bản trước, khoảng 2.500 USD.',
      'Các tính năng mới đáng chú ý gồm tích hợp AI Apple Intelligence trực tiếp, hỗ trợ tracking tay 3D chính xác hơn và mở rộng thư viện ứng dụng visionOS lên hơn 5000 ứng dụng.',
    ],
  },
  {
    title: 'Cách làm bánh mì nướng giòn tan kiểu Sài Gòn — công thức chuẩn',
    excerpt:
      'Bánh mì giòn tan kiểu Sài Gòn không khó như bạn nghĩ. Công thức chi tiết với mẹo nhỏ để vỏ giòn rụm bên trong mềm xốp.',
    imageCount: 3,
    youtube: false,
    video: true,
    paragraphs: [
      'Bánh mì Sài Gòn nổi tiếng với vỏ giòn rụm và ruột mềm xốp. Để có được kết cấu hoàn hảo này, cần đảm bảo 3 yếu tố: bột làm đúng, ủ đủ thời gian và nhiệt độ nướng chuẩn.',
      'Nguyên liệu: 500g bột mì số 13, 7g men instant, 8g muối, 10g đường, 320ml nước ấm. Lưu ý dùng bột chất lượng cao, men còn hạn để bánh nở đều và đẹp.',
      'Mẹo nhỏ: trước khi nướng, phun nhẹ nước lên mặt bánh để tạo độ giòn. Lò nướng cần làm nóng trước 220°C ít nhất 15 phút. Nướng 18-20 phút đến khi vỏ vàng đậm, gõ vào nghe rỗng là chín.',
    ],
  },
  {
    title: 'Top 5 phim Hàn đang gây sốt tháng 5 — đáng xem nhất',
    excerpt:
      'Tháng 5 này có hàng loạt phim Hàn mới ra mắt với rating cực cao. Đây là 5 bộ phim không thể bỏ qua nếu bạn là fan K-drama.',
    imageCount: 3,
    youtube: true,
    paragraphs: [
      'K-drama tháng 5 chứng kiến sự bùng nổ với hàng loạt bom tấn mới ra mắt. Từ thriller tâm lý đến romance lãng mạn, có đủ thể loại cho mọi gout xem phim.',
      "Đứng đầu danh sách là phim 'Khói lửa Seoul' với rating 18.5%, theo sau là 'Tình yêu thầm lặng' (15.2%) và bom tấn thriller 'Đêm trắng' (13.8%). Cả ba đều có dàn diễn viên hàng đầu và kịch bản chặt chẽ.",
      "Hai vị trí còn lại thuộc về 'Yêu một lần và mãi mãi' (12.1%) và 'Ác quỷ Hangang' (11.5%). Đặc biệt phim 'Ác quỷ Hangang' có yếu tố kinh dị nhẹ phù hợp xem cuối tuần.",
    ],
  },
  {
    title: 'Đà Lạt mùa hoa anh đào — lịch trình 2 ngày 1 đêm chi tiết',
    excerpt:
      'Đà Lạt đang vào mùa hoa anh đào nở rộ. Bài viết chia sẻ lịch trình du lịch 2 ngày 1 đêm với chi phí trọn gói chỉ 1.5 triệu/người.',
    imageCount: 3,
    youtube: true,
    paragraphs: [
      'Tháng 5 là thời điểm hoa anh đào Đà Lạt nở rộ nhất, đặc biệt tại các con đường ven hồ Xuân Hương và đường Hoàng Diệu. Đây là cơ hội tuyệt vời để săn ảnh và tận hưởng không khí mát lạnh.',
      'Lịch trình ngày 1: sáng đến Đà Lạt, ăn sáng tại quán bánh canh Xuân Hương, tham quan Quảng trường Lâm Viên, chiều check-in đồi chè Cầu Đất. Tối ăn lẩu gà lá é và dạo chợ đêm.',
      'Ngày 2: sáng dậy sớm săn mây tại Cầu Đất, ăn sáng bánh mì xíu mại Cô Hoa. Chiều check-in các điểm hoa anh đào nổi tiếng và mua đặc sản về làm quà. Tổng chi phí khoảng 1.5 triệu/người chưa kể vé máy bay.',
    ],
  },
  {
    title: 'Lễ hội pháo hoa Đà Nẵng 2026 — tổng kết đêm khai mạc hoành tráng',
    excerpt:
      "Đêm khai mạc DIFF 2026 với chủ đề 'Tinh hoa văn hóa' thu hút hơn 100 nghìn khán giả. Đội Pháp đã có màn trình diễn ấn tượng.",
    imageCount: 3,
    youtube: true,
    paragraphs: [
      "Đêm khai mạc Lễ hội Pháo hoa Quốc tế Đà Nẵng 2026 (DIFF 2026) diễn ra tối 2/5 với chủ đề 'Tinh hoa văn hóa' đã thu hút hơn 100 nghìn khán giả từ khắp mọi miền tổ quốc.",
      'Đội Pháp mở màn với màn trình diễn 22 phút kết hợp âm nhạc cổ điển Pháp và 7000 quả pháo bay. Các hình ảnh tháp Eiffel, hoa hướng dương và biểu tượng La Marseillaise được tạo hình ấn tượng trên bầu trời.',
      "Đội Việt Nam trình diễn ngay sau với chủ đề 'Hà Nội ngàn năm văn hiến' bao gồm hình ảnh Hồ Gươm, chùa Một Cột và áo dài truyền thống. Sự cố gắng của hai đội đã nhận được tràng pháo tay không ngớt từ khán giả.",
    ],
  },
  {
    title: 'Phú Quốc resort 5 sao giá rẻ bất ngờ — chỉ từ 2 triệu/đêm',
    excerpt:
      "Mùa hè này, Phú Quốc tung loạt deal resort 5 sao chỉ từ 2 triệu/đêm dành cho khách nội địa. Đây là cơ hội vàng để 'ngủ trong mơ'.",
    imageCount: 3,
    youtube: false,
    paragraphs: [
      'Mùa du lịch hè 2026 chứng kiến cuộc đua giảm giá khốc liệt giữa các resort 5 sao tại Phú Quốc. Nhiều khách sạn đỉnh chỉ niêm yết từ 2 triệu/đêm để hút khách nội địa giữa mùa cao điểm.',
      'Top 3 resort đáng chú ý: JW Marriott Phú Quốc (2.5 triệu), Vinpearl Resort (2.2 triệu) và Sun Premier Village (2.1 triệu). Tất cả đều bao gồm bữa sáng buffet và xe đón tiễn sân bay miễn phí.',
      'Mẹo đặt phòng: đặt qua các app như Agoda, Booking để có thêm ưu đãi 5-10%. Tránh các ngày cuối tuần vì giá thường tăng gấp đôi. Tốt nhất nên đi vào giữa tuần để tiết kiệm và tránh đông.',
    ],
  },
  {
    title: 'Idol Hàn Quốc bất ngờ thăm Việt Nam — fan vây kín sân bay',
    excerpt:
      'Tối qua, idol J từ nhóm nhạc nam đình đám Hàn Quốc bất ngờ xuất hiện tại sân bay Tân Sơn Nhất, khiến hàng nghìn fan vây kín lối ra.',
    imageCount: 2,
    youtube: true,
    paragraphs: [
      'Tối ngày 3/5, idol J — thành viên nhóm nhạc nam đình đám Hàn Quốc — đã bất ngờ xuất hiện tại sân bay Tân Sơn Nhất TPHCM. Hàng nghìn fan đã vây kín khu vực lối ra để chào đón thần tượng.',
      'Theo nguồn tin, J đến Việt Nam để tham dự sự kiện quảng bá sản phẩm mới của một thương hiệu mỹ phẩm Hàn Quốc. Anh sẽ ở Việt Nam khoảng 3 ngày và có cơ hội gặp gỡ một số fan may mắn.',
      'An ninh sân bay đã phải huy động thêm lực lượng để đảm bảo trật tự. J đã mỉm cười vẫy tay chào fan trước khi lên xe rời sân bay. Một số fan đã tặng quà và hoa nhưng do giới hạn an ninh nên chỉ một phần được nhận.',
    ],
  },
];

const YOUTUBE_IDS = [
  'dQw4w9WgXcQ',
  'kJQP7kiw5Fk',
  '9bZkp7q19f0',
  'fJ9rUzIMcZQ',
  'L_jWHffIx5E',
  'ASO_zypdnsQ',
  'OPf0YbXqDm0',
  '60ItHLz5WEA',
  'RgKAFK5djSk',
  'uelHwf8o7_U',
];

// Public Google sample MP4s — no auth, CORS-friendly, reliable CDN.
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
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

function coverUrl(slug: string): string {
  return `https://picsum.photos/seed/${slug}-cover/1280/720`;
}
function bodyImageUrl(slug: string, n: number): string {
  return `https://picsum.photos/seed/${slug}-body-${n}/960/540`;
}

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

function buildContentHtml(slug: string, article: DemoArticle, ytId: string | null): string {
  const parts: string[] = [];
  const [p1, p2, p3] = article.paragraphs;

  parts.push(`<p>${p1}</p>`);
  parts.push(`<p><img src="${bodyImageUrl(slug, 0)}" alt="${article.title}" loading="lazy" /></p>`);
  parts.push(`<p>${p2}</p>`);

  if (ytId) {
    parts.push(
      `<div class="video-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1rem 0;">` +
        `<iframe src="https://www.youtube.com/embed/${ytId}" ` +
        `style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" ` +
        `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
        `allowfullscreen></iframe>` +
        `</div>`,
    );
  }

  parts.push(`<p>${p3}</p>`);

  if (article.imageCount >= 2) {
    parts.push(
      `<p><img src="${bodyImageUrl(slug, 1)}" alt="Minh họa cho ${article.title}" loading="lazy" /></p>`,
    );
  }

  if (article.video) {
    const src = pick(SAMPLE_VIDEOS);
    parts.push(
      `<p><video controls preload="metadata" style="width:100%;max-width:100%;border-radius:8px;" ` +
        `poster="${bodyImageUrl(slug, 2)}">` +
        `<source src="${src}" type="video/mp4">` +
        `Trình duyệt không hỗ trợ HTML5 video.</video></p>`,
    );
  }

  if (article.imageCount >= 3) {
    parts.push(
      `<p><img src="${bodyImageUrl(slug, 2)}" alt="Hình ảnh thứ 3 cho ${article.title}" loading="lazy" /></p>`,
    );
  }

  return parts.join('\n');
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
    const article = ARTICLES[(i - 1) % ARTICLES.length]!;
    const slug = `demo-${i}`;
    const ytId = article.youtube ? (YOUTUBE_IDS[(i - 1) % YOUTUBE_IDS.length] ?? null) : null;
    const contentHtml = buildContentHtml(slug, article, ytId);
    const coverImageUrl = coverUrl(slug);
    const publishedAt = randomPastDate(WINDOW_DAYS);

    const post = await prisma.post.upsert({
      where: { slug },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        contentHtml,
        contentJson: buildContentJson(contentHtml) as never,
        coverImageUrl,
        publishedAt,
        status: 'PUBLISHED',
      },
      create: {
        slug,
        title: article.title,
        excerpt: article.excerpt,
        contentHtml,
        contentJson: buildContentJson(contentHtml) as never,
        coverImageUrl,
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
