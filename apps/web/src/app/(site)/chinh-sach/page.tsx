import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách affiliate',
  description: 'Thông tin minh bạch về liên kết affiliate trên trang.',
};

export default function ChinhSachPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        Chính sách affiliate
      </h1>
      <p className="mt-2 text-sm text-muted-fg">
        Cập nhật: {new Date().toLocaleDateString('vi-VN')}
      </p>

      <div className="prose-news mt-8">
        <p>
          Trang web này tham gia chương trình tiếp thị liên kết (affiliate marketing) với các sàn
          thương mại điện tử như <strong>Shopee</strong>, <strong>TikTok Shop</strong>,{' '}
          <strong>Lazada</strong> và các đối tác khác. Khi bạn nhấn vào một liên kết affiliate trên
          trang và thực hiện giao dịch mua sắm, chúng tôi có thể nhận được một khoản hoa hồng từ sàn
          đối tác. Khoản hoa hồng này <strong>không làm tăng giá sản phẩm</strong> mà bạn phải trả.
        </p>

        <h2>Hình thức hiển thị</h2>
        <p>
          Một số bài viết có thể đi kèm popup giới thiệu sản phẩm. Các popup này được thiết kế phù
          hợp với thiết bị di động và có thể chứa link mua hàng dẫn tới sàn TMĐT. Bạn hoàn toàn có
          quyền đóng popup hoặc bỏ qua liên kết.
        </p>

        <h2>Nguyên tắc của chúng tôi</h2>
        <ul>
          <li>Nội dung biên tập độc lập, không bị đối tác chi phối.</li>
          <li>Không lưu trữ thông tin thanh toán của người dùng.</li>
          <li>Tôn trọng quyền riêng tư: dữ liệu phân tích được ẩn danh hóa.</li>
          <li>
            Tuân thủ Luật Quảng cáo của Việt Nam và các quy định liên quan đến tiếp thị liên kết.
          </li>
        </ul>

        <h2>Liên hệ</h2>
        <p>
          Mọi thắc mắc vui lòng liên hệ qua email hoặc kênh liên hệ chính thức của trang. Cảm ơn bạn
          đã ủng hộ.
        </p>
      </div>
    </article>
  );
}
