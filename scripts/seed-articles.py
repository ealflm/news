#!/usr/bin/env python3
"""Seed 20 Vietnamese drama/news articles with uploaded images, YouTube embeds, and videos."""

import os
import json
import time
import tempfile
import subprocess
import requests

API_URL = "http://localhost:4000"
WEB_URL = "http://localhost:3000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin123!@#"

# Real popular YouTube IDs (mix of music + clips)
YT_IDS = [
    "dQw4w9WgXcQ", "kJQP7kiw5Fk", "9bZkp7q19f0", "fJ9rUzIMcZQ",
    "L_jWHffIx5E", "ASO_zypdnsQ", "OPf0YbXqDm0", "60ItHLz5WEA",
    "RgKAFK5djSk", "uelHwf8o7_U",
]

ARTICLES = [
    {
        "title": "Sốc: Cặp đôi nổi tiếng V và Y bất ngờ tuyên bố chia tay sau 5 năm bên nhau",
        "excerpt": "Tin sốc lan truyền khắp MXH tối qua khi cặp đôi vàng V và Y chính thức xác nhận đường ai nấy đi sau hơn 5 năm bền chặt.",
        "image_count": 2,
        "youtube": True,
        "paragraphs": [
            "Tối ngày hôm qua, cộng đồng mạng đồng loạt sốc khi cặp đôi vàng của showbiz Việt — anh V và chị Y — bất ngờ tuyên bố chính thức chia tay sau 5 năm bên nhau. Cả hai từng là biểu tượng tình yêu của giới trẻ với hàng loạt khoảnh khắc ngọt ngào trên Instagram.",
            "Theo một nguồn tin thân cận tiết lộ, hai người đã có những bất đồng khó hàn gắn trong 6 tháng qua. Lịch trình bận rộn cùng áp lực từ truyền thông được cho là nguyên nhân chính khiến mối quan hệ rạn nứt. Fan club của cả hai phía đã không kịp định thần khi nhận được thông tin này.",
            "Đại diện của cả hai phía đã chính thức xác nhận thông tin và đề nghị mọi người tôn trọng quyết định cá nhân. Họ cũng cảm ơn fan đã đồng hành suốt thời gian qua và hứa sẽ tiếp tục cống hiến hết mình cho sự nghiệp riêng.",
        ],
    },
    {
        "title": "TOP 10 voucher Shopee giảm sốc tháng 5 — không thể bỏ lỡ",
        "excerpt": "Tổng hợp 10 mã giảm giá hot nhất Shopee tháng này, có mã giảm tới 500K cho đơn từ 1 triệu — săn ngay kẻo hết!",
        "image_count": 3,
        "youtube": False,
        "paragraphs": [
            "Tháng 5 này, Shopee tung loạt voucher giảm giá khủng dành cho khách hàng VIP và người mua sắm thường xuyên. Đây là cơ hội vàng để săn hàng giá rẻ trước mùa cao điểm hè.",
            "Đặc biệt, có 3 mã giảm tới 500.000đ cho đơn từ 1 triệu, áp dụng cho gian hàng Shopee Mall. Người dùng cần lưu ý thời gian áp dụng và số lượng voucher có hạn.",
            "Bí kíp để săn voucher hiệu quả: bật thông báo từ ứng dụng Shopee, đăng nhập vào khung giờ 9h, 12h và 21h hàng ngày. Đặt sẵn giỏ hàng và sẵn sàng nhấn checkout ngay khi voucher mở.",
        ],
    },
    {
        "title": "Clip 2 cô gái quẩy zay ở ngã 3 Eakao gây bão MXH",
        "excerpt": "Một đoạn clip ngắn quay tại ngã 3 Eakao thu hút hàng triệu lượt xem chỉ sau 24h. Cộng đồng mạng bàn tán không ngớt.",
        "image_count": 2,
        "youtube": True,
        "video": True,
        "paragraphs": [
            "Clip ghi lại cảnh hai cô gái nhảy theo điệu nhạc trẻ trung ngay tại ngã 3 Eakao đã làm dậy sóng cộng đồng mạng. Đoạn video chỉ dài 15 giây nhưng nhanh chóng đạt hơn 2 triệu lượt xem.",
            "Nhiều người dùng TikTok và Facebook đã chia sẻ lại clip với loạt bình luận hài hước. Có ý kiến khen ngợi sự tự tin của hai bạn trẻ, cũng có ý kiến trái chiều về việc nhảy ở nơi công cộng.",
            "Hiện danh tính của hai cô gái vẫn chưa được tiết lộ. Cộng đồng mạng đang tích cực truy tìm thông tin để liên hệ.",
        ],
    },
    {
        "title": "Đánh giá iPhone 17 Pro Max sau 1 tháng sử dụng: liệu có đáng nâng cấp?",
        "excerpt": "Sau 30 ngày trải nghiệm thực tế iPhone 17 Pro Max, đây là những điểm cộng và điểm trừ bạn cần biết trước khi xuống tiền.",
        "image_count": 3,
        "youtube": True,
        "paragraphs": [
            "iPhone 17 Pro Max ra mắt giữa tháng 4 với hàng loạt nâng cấp đáng giá. Sau 1 tháng sử dụng làm máy chính, tôi xin chia sẻ những trải nghiệm chân thực nhất về siêu phẩm này.",
            "Điểm cộng lớn nhất là camera 48MP cải tiến cho ảnh thiếu sáng xuất sắc, pin trâu hơn 20% so với thế hệ trước. Chip A19 Pro mạnh mẽ xử lý mọi tác vụ mượt mà từ chỉnh sửa video 4K đến chơi game đồ họa nặng.",
            "Tuy nhiên, giá bán khởi điểm từ 35 triệu đồng vẫn là rào cản lớn. Trọng lượng máy nặng hơn, sử dụng lâu dễ mỏi tay khi cầm. Nếu đang dùng iPhone 15 Pro, mình khuyên không nhất thiết phải nâng cấp ngay.",
        ],
    },
    {
        "title": "Nữ ca sĩ X bất ngờ lộ clip nóng, fan đồng loạt tẩy chay",
        "excerpt": "Một đoạn clip nhạy cảm của nữ ca sĩ X bị phát tán trên mạng, gây tranh cãi dữ dội trong cộng đồng fan và truyền thông.",
        "image_count": 2,
        "youtube": False,
        "paragraphs": [
            "Vào sáng nay, một đoạn clip nhạy cảm được cho là của nữ ca sĩ trẻ X đã bị phát tán rộng rãi trên các diễn đàn. Sự việc nhanh chóng leo lên top tìm kiếm trên các nền tảng MXH Việt Nam.",
            "Đại diện của ca sĩ X đã lên tiếng phủ nhận, khẳng định clip là sản phẩm cắt ghép bằng AI. Tuy nhiên, nhiều fan kỳ cựu đã tuyên bố quay lưng và rời khỏi cộng đồng người hâm mộ.",
            "Vụ việc tiếp tục đặt ra câu hỏi về vấn đề deepfake và quyền riêng tư của người nổi tiếng trong thời đại AI phát triển nhanh chóng.",
        ],
    },
    {
        "title": "Bí kíp săn hàng Lazada sale 5.5 — giảm tới 70% cho khách mới",
        "excerpt": "Sự kiện Lazada Birthday 5.5 trở lại với hàng nghìn deal hấp dẫn. Bài viết chia sẻ chiến thuật săn deal hiệu quả nhất.",
        "image_count": 2,
        "youtube": True,
        "paragraphs": [
            "Lazada chính thức khởi động sự kiện sinh nhật 5.5 từ 0h ngày 5/5, kéo dài đến hết 7/5. Đây là dịp lớn nhất trong tháng với hàng nghìn deal giảm tới 70% và freeship toàn quốc.",
            "Chiến thuật săn deal hiệu quả: đăng ký Lazada Bonus, mở app vào 0h, 12h và 21h để gom xu, tham gia mini game để nhận voucher độc quyền. Khách hàng mới còn được tặng mã giảm 100K không điều kiện.",
            "Lưu ý: nhiều deal flash sale chỉ kéo dài 1 phút, hãy đặt sẵn sản phẩm yêu thích vào giỏ và sẵn sàng checkout. Combo voucher + xu có thể giúp tiết kiệm tới 40% so với giá niêm yết.",
        ],
    },
    {
        "title": "MC nổi tiếng bị BTV cũ tố quỵt lương 6 tháng, lộ tin nhắn đòi nợ",
        "excerpt": "Drama mới nhất trong giới truyền hình: MC kỳ cựu bị tố quỵt lương BTV cũ tới 6 tháng, các tin nhắn đòi nợ bị tung lên MXH.",
        "image_count": 2,
        "youtube": False,
        "paragraphs": [
            "Câu chuyện gây xôn xao giới truyền hình tuần qua khi một BTV trẻ đã đăng đàn tố cáo MC nổi tiếng quỵt lương suốt 6 tháng làm việc. Tin nhắn đòi nợ kèm chứng từ chuyển khoản được công bố công khai.",
            "MC bị tố tên viết tắt là H., hiện đang dẫn một chương trình giải trí hàng đầu. Phản hồi đầu tiên từ phía MC chỉ là một dòng status mơ hồ trên Facebook cá nhân khiến cộng đồng càng dậy sóng.",
            "Cộng đồng mạng đang chia làm hai phe: một bên ủng hộ BTV trẻ dũng cảm lên tiếng, một bên cho rằng nên giải quyết riêng thay vì 'đem chuyện ra MXH'.",
        ],
    },
    {
        "title": "Hoa hậu Z bị bóc phốt mua giải, BTC chính thức lên tiếng",
        "excerpt": "Hoa hậu Z vừa đăng quang đã bị một thí sinh khác bóc phốt mua giải trị giá 5 tỷ. Ban tổ chức buộc phải lên tiếng giải thích.",
        "image_count": 2,
        "youtube": True,
        "paragraphs": [
            "Cuộc thi nhan sắc tổ chức tháng 4 vừa qua đang gặp scandal lớn khi một thí sinh top 5 đăng status tố cáo Hoa hậu Z đã chi 5 tỷ đồng để mua giải. Bài viết kèm theo các bằng chứng giao dịch chuyển khoản và tin nhắn nội bộ.",
            "Ban tổ chức ngay lập tức lên tiếng phủ nhận, khẳng định kết quả là khách quan dựa trên điểm số tổng hợp từ ba vòng thi. Họ cũng đe dọa kiện ngược thí sinh tố cáo nếu không cung cấp bằng chứng cụ thể.",
            "Hoa hậu Z chưa có phản hồi chính thức nào ngoài việc đóng comment trên toàn bộ bài đăng Instagram. Người hâm mộ chia thành hai phe rõ rệt.",
        ],
    },
    {
        "title": "TikTok Shop tung mã giảm freeship toàn quốc nhân dịp 5.5",
        "excerpt": "Cuối tuần này, TikTok Shop chạy chương trình freeship toàn quốc kèm voucher giảm 30% cho đơn từ 99K. Mua ngay kẻo lỡ!",
        "image_count": 2,
        "youtube": True,
        "paragraphs": [
            "TikTok Shop chính thức công bố chương trình khuyến mãi lớn nhân dịp 5.5 với mã giảm freeship toàn quốc và voucher 30% cho đơn từ 99.000đ. Chương trình kéo dài 3 ngày từ 5/5 đến 7/5.",
            "Đặc biệt, các shop hot trên TikTok còn tung ra livestream với deal chỉ có trong khung giờ vàng. Người mua có thể đặt được giá rẻ hơn 50% so với các sàn TMĐT khác.",
            "Lưu ý: TikTok Shop hiện chỉ hỗ trợ thanh toán qua MoMo, ZaloPay, ngân hàng nội địa và COD. Khi gặp vấn đề về đơn hàng, người dùng liên hệ trực tiếp với shop qua tin nhắn riêng tư.",
        ],
    },
    {
        "title": "L'Oreal Watergel UV Defender — review chi tiết sau 2 tuần sử dụng",
        "excerpt": "Kem chống nắng đang gây sốt MXH với khả năng chống tia UV mạnh mẽ và không gây nhờn. Liệu có xứng đáng với giá hơn 400K?",
        "image_count": 3,
        "youtube": False,
        "paragraphs": [
            "L'Oreal Watergel UV Defender là một trong những sản phẩm chống nắng hot nhất tháng 5, được nhiều beauty blogger Việt khen ngợi không tiếc lời. Vậy thực tế chất lượng có như quảng cáo?",
            "Sau 2 tuần sử dụng liên tục, tôi nhận thấy kem thấm rất nhanh, không để lại vệt trắng và đặc biệt không gây bí lỗ chân lông. Chỉ số SPF50+ PA++++ đảm bảo bảo vệ da tuyệt vời dưới nắng gắt Sài Gòn.",
            "Tuy nhiên, giá hơn 400.000đ/tuýp 50ml là khá cao so với mặt bằng chung. Người da khô sẽ cần kết hợp thêm dưỡng ẩm. Nhìn chung, đây là sản phẩm đáng đầu tư nếu bạn ưu tiên chất lượng.",
        ],
    },
    {
        "title": "Cậu bé 8 tuổi nhặt được 50 triệu trả lại người mất, nhận khen từ công an",
        "excerpt": "Câu chuyện đẹp giữa lòng thành phố: bé Nam, 8 tuổi, nhặt được túi tiền 50 triệu và mang đến công an tìm chủ nhân.",
        "image_count": 2,
        "youtube": True,
        "paragraphs": [
            "Câu chuyện xúc động giữa lòng thành phố khi bé Nam, học sinh lớp 3 tại quận Tân Bình, đã nhặt được một túi nylon chứa 50 triệu đồng tiền mặt. Không chút do dự, em đã chạy ngay tới đồn công an gần nhất để giao nộp.",
            "Sau khi xác minh, công an phường đã liên hệ được với chủ nhân là một tiểu thương đánh rơi trên đường đi giao hàng. Người này đã rất xúc động khi nhận lại được số tiền tích cóp suốt 6 tháng.",
            "Bé Nam được công an phường khen ngợi và tặng giấy khen. Câu chuyện được lan tỏa khắp MXH như một bài học đẹp về tính trung thực trong xã hội hiện đại.",
        ],
    },
    {
        "title": "Bà chủ quán phở Hà Nội bóc phốt khách bùng tiền — đoạn camera gây bão",
        "excerpt": "Đoạn camera ghi lại cảnh khách ăn xong rồi vọt mất không trả tiền tại quán phở nổi tiếng Hà Nội đang gây xôn xao MXH.",
        "image_count": 2,
        "youtube": False,
        "video": True,
        "paragraphs": [
            "Tối ngày 3/5, một quán phở nổi tiếng tại phố cổ Hà Nội đã đăng tải đoạn camera ghi lại cảnh nhóm 4 khách trẻ ăn xong rồi nhanh chóng rời quán mà không thanh toán. Tổng hóa đơn lên tới 850.000đ.",
            "Bà chủ quán bức xúc cho biết đây không phải lần đầu xảy ra tình trạng này, nhưng đây là lần đầu tiên có camera ghi lại rõ mặt. Cộng đồng mạng nhanh chóng truy tìm thông tin của nhóm khách này.",
            "Hiện công an phường đang vào cuộc xác minh. Nhiều người dùng MXH đã đề nghị quán phở chính thức nộp đơn tố cáo để răn đe những hành vi tương tự.",
        ],
    },
    {
        "title": "Học sinh đánh nhau tại cổng trường — clip viral khắp MXH",
        "excerpt": "Đoạn clip ghi lại cảnh hai học sinh THCS đánh nhau dữ dội ngay cổng trường khiến phụ huynh và nhà trường vào cuộc.",
        "image_count": 2,
        "youtube": True,
        "paragraphs": [
            "Sự việc đáng buồn xảy ra chiều ngày 2/5 tại cổng trường THCS X. Hai học sinh lớp 8 đã có mâu thuẫn từ trước và quyết định 'giải quyết' ngay cổng trường sau giờ tan học.",
            "Đoạn clip do bạn học cùng quay lại đã nhanh chóng lan truyền trên TikTok và Facebook. Nhà trường ngay lập tức tổ chức cuộc họp khẩn với phụ huynh hai bên để xử lý vụ việc.",
            "Hai học sinh đã bị tạm đình chỉ học một tuần và phải tham gia chương trình giáo dục kỹ năng sống. Vụ việc đặt ra cảnh báo về tình trạng bạo lực học đường ngày càng phức tạp.",
        ],
    },
    {
        "title": "Apple Vision Pro 2 ra mắt 2026 — có gì mới đáng mong đợi?",
        "excerpt": "Apple chính thức xác nhận sẽ ra mắt Vision Pro 2 vào quý 4/2026 với loạt nâng cấp đáng giá về camera, pin và giá bán.",
        "image_count": 3,
        "youtube": True,
        "paragraphs": [
            "Trong sự kiện Spring Event vừa diễn ra, Apple đã chính thức xác nhận sẽ ra mắt Vision Pro thế hệ 2 vào quý 4 năm 2026. Đây là nâng cấp lớn sau hơn 2 năm kể từ thế hệ đầu tiên.",
            "Vision Pro 2 sẽ có camera depth-sensing cải tiến, thời lượng pin lên tới 4 giờ sử dụng liên tục và đặc biệt là giá bán dự kiến giảm 30% so với phiên bản trước, khoảng 2.500 USD.",
            "Các tính năng mới đáng chú ý gồm tích hợp AI Apple Intelligence trực tiếp, hỗ trợ tracking tay 3D chính xác hơn và mở rộng thư viện ứng dụng visionOS lên hơn 5000 ứng dụng.",
        ],
    },
    {
        "title": "Cách làm bánh mì nướng giòn tan kiểu Sài Gòn — công thức chuẩn",
        "excerpt": "Bánh mì giòn tan kiểu Sài Gòn không khó như bạn nghĩ. Công thức chi tiết với mẹo nhỏ để vỏ giòn rụm bên trong mềm xốp.",
        "image_count": 3,
        "youtube": False,
        "video": True,
        "paragraphs": [
            "Bánh mì Sài Gòn nổi tiếng với vỏ giòn rụm và ruột mềm xốp. Để có được kết cấu hoàn hảo này, cần đảm bảo 3 yếu tố: bột làm đúng, ủ đủ thời gian và nhiệt độ nướng chuẩn.",
            "Nguyên liệu: 500g bột mì số 13, 7g men instant, 8g muối, 10g đường, 320ml nước ấm. Lưu ý dùng bột chất lượng cao, men còn hạn để bánh nở đều và đẹp.",
            "Mẹo nhỏ: trước khi nướng, phun nhẹ nước lên mặt bánh để tạo độ giòn. Lò nướng cần làm nóng trước 220°C ít nhất 15 phút. Nướng 18-20 phút đến khi vỏ vàng đậm, gõ vào nghe rỗng là chín.",
        ],
    },
    {
        "title": "Top 5 phim Hàn đang gây sốt tháng 5 — đáng xem nhất",
        "excerpt": "Tháng 5 này có hàng loạt phim Hàn mới ra mắt với rating cực cao. Đây là 5 bộ phim không thể bỏ qua nếu bạn là fan K-drama.",
        "image_count": 3,
        "youtube": True,
        "paragraphs": [
            "K-drama tháng 5 chứng kiến sự bùng nổ với hàng loạt bom tấn mới ra mắt. Từ thriller tâm lý đến romance lãng mạn, có đủ thể loại cho mọi gout xem phim.",
            "Đứng đầu danh sách là phim 'Khói lửa Seoul' với rating 18.5%, theo sau là 'Tình yêu thầm lặng' (15.2%) và bom tấn thriller 'Đêm trắng' (13.8%). Cả ba đều có dàn diễn viên hàng đầu và kịch bản chặt chẽ.",
            "Hai vị trí còn lại thuộc về 'Yêu một lần và mãi mãi' (12.1%) và 'Ác quỷ Hangang' (11.5%). Đặc biệt phim 'Ác quỷ Hangang' có yếu tố kinh dị nhẹ phù hợp xem cuối tuần.",
        ],
    },
    {
        "title": "Đà Lạt mùa hoa anh đào — lịch trình 2 ngày 1 đêm chi tiết",
        "excerpt": "Đà Lạt đang vào mùa hoa anh đào nở rộ. Bài viết chia sẻ lịch trình du lịch 2 ngày 1 đêm với chi phí trọn gói chỉ 1.5 triệu/người.",
        "image_count": 3,
        "youtube": True,
        "paragraphs": [
            "Tháng 5 là thời điểm hoa anh đào Đà Lạt nở rộ nhất, đặc biệt tại các con đường ven hồ Xuân Hương và đường Hoàng Diệu. Đây là cơ hội tuyệt vời để săn ảnh và tận hưởng không khí mát lạnh.",
            "Lịch trình ngày 1: sáng đến Đà Lạt, ăn sáng tại quán bánh canh Xuân Hương, tham quan Quảng trường Lâm Viên, chiều check-in đồi chè Cầu Đất. Tối ăn lẩu gà lá é và dạo chợ đêm.",
            "Ngày 2: sáng dậy sớm săn mây tại Cầu Đất, ăn sáng bánh mì xíu mại Cô Hoa. Chiều check-in các điểm hoa anh đào nổi tiếng và mua đặc sản về làm quà. Tổng chi phí khoảng 1.5 triệu/người chưa kể vé máy bay.",
        ],
    },
    {
        "title": "Lễ hội pháo hoa Đà Nẵng 2026 — tổng kết đêm khai mạc hoành tráng",
        "excerpt": "Đêm khai mạc DIFF 2026 với chủ đề 'Tinh hoa văn hóa' thu hút hơn 100 nghìn khán giả. Đội Pháp đã có màn trình diễn ấn tượng.",
        "image_count": 3,
        "youtube": True,
        "paragraphs": [
            "Đêm khai mạc Lễ hội Pháo hoa Quốc tế Đà Nẵng 2026 (DIFF 2026) diễn ra tối 2/5 với chủ đề 'Tinh hoa văn hóa' đã thu hút hơn 100 nghìn khán giả từ khắp mọi miền tổ quốc.",
            "Đội Pháp mở màn với màn trình diễn 22 phút kết hợp âm nhạc cổ điển Pháp và 7000 quả pháo bay. Các hình ảnh tháp Eiffel, hoa hướng dương và biểu tượng La Marseillaise được tạo hình ấn tượng trên bầu trời.",
            "Đội Việt Nam trình diễn ngay sau với chủ đề 'Hà Nội ngàn năm văn hiến' bao gồm hình ảnh Hồ Gươm, chùa Một Cột và áo dài truyền thống. Sự cố gắng của hai đội đã nhận được tràng pháo tay không ngớt từ khán giả.",
        ],
    },
    {
        "title": "Phú Quốc resort 5 sao giá rẻ bất ngờ — chỉ từ 2 triệu/đêm",
        "excerpt": "Mùa hè này, Phú Quốc tung loạt deal resort 5 sao chỉ từ 2 triệu/đêm dành cho khách nội địa. Đây là cơ hội vàng để 'ngủ trong mơ'.",
        "image_count": 3,
        "youtube": False,
        "paragraphs": [
            "Mùa du lịch hè 2026 chứng kiến cuộc đua giảm giá khốc liệt giữa các resort 5 sao tại Phú Quốc. Nhiều khách sạn đỉnh chỉ niêm yết từ 2 triệu/đêm để hút khách nội địa giữa mùa cao điểm.",
            "Top 3 resort đáng chú ý: JW Marriott Phú Quốc (2.5 triệu), Vinpearl Resort (2.2 triệu) và Sun Premier Village (2.1 triệu). Tất cả đều bao gồm bữa sáng buffet và xe đón tiễn sân bay miễn phí.",
            "Mẹo đặt phòng: đặt qua các app như Agoda, Booking để có thêm ưu đãi 5-10%. Tránh các ngày cuối tuần vì giá thường tăng gấp đôi. Tốt nhất nên đi vào giữa tuần để tiết kiệm và tránh đông.",
        ],
    },
    {
        "title": "Idol Hàn Quốc bất ngờ thăm Việt Nam — fan vây kín sân bay",
        "excerpt": "Tối qua, idol J từ nhóm nhạc nam đình đám Hàn Quốc bất ngờ xuất hiện tại sân bay Tân Sơn Nhất, khiến hàng nghìn fan vây kín lối ra.",
        "image_count": 2,
        "youtube": True,
        "paragraphs": [
            "Tối ngày 3/5, idol J — thành viên nhóm nhạc nam đình đám Hàn Quốc — đã bất ngờ xuất hiện tại sân bay Tân Sơn Nhất TPHCM. Hàng nghìn fan đã vây kín khu vực lối ra để chào đón thần tượng.",
            "Theo nguồn tin, J đến Việt Nam để tham dự sự kiện quảng bá sản phẩm mới của một thương hiệu mỹ phẩm Hàn Quốc. Anh sẽ ở Việt Nam khoảng 3 ngày và có cơ hội gặp gỡ một số fan may mắn.",
            "An ninh sân bay đã phải huy động thêm lực lượng để đảm bảo trật tự. J đã mỉm cười vẫy tay chào fan trước khi lên xe rời sân bay. Một số fan đã tặng quà và hoa nhưng do giới hạn an ninh nên chỉ một phần được nhận.",
        ],
    },
]

assert len(ARTICLES) == 20, f"Expected 20 articles, got {len(ARTICLES)}"


def login():
    s = requests.Session()
    r = s.post(
        f"{WEB_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    r.raise_for_status()
    return s


def fetch_image_bytes(seed: str, w: int = 1280, h: int = 720) -> bytes:
    """Fetch a random image from picsum.photos with retries."""
    for attempt in range(3):
        try:
            r = requests.get(
                f"https://picsum.photos/seed/{seed}/{w}/{h}",
                timeout=15,
                allow_redirects=True,
            )
            if r.status_code == 200 and len(r.content) > 1000:
                return r.content
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError(f"Failed to fetch image for seed={seed}")


def upload_image(session, seed: str) -> str:
    """Upload an image and return its full URL."""
    data = fetch_image_bytes(seed)
    files = {"file": (f"{seed}.jpg", data, "image/jpeg")}
    r = session.post(f"{WEB_URL}/api/media", files=files, timeout=30)
    r.raise_for_status()
    media = r.json()["media"]
    variants = media.get("variants") or {}
    path = (
        variants.get("1280w")
        or variants.get("720w")
        or variants.get("320w")
        or variants.get("orig")
        or media.get("originalPath")
    )
    return f"{API_URL}{path}"


def generate_test_video() -> str:
    """Generate a small mp4 with ffmpeg color bars and return its filename."""
    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    tmp.close()
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=3:size=640x360:rate=24",
        "-f", "lavfi",
        "-i", "sine=frequency=1000:duration=3",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        tmp.name,
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    return tmp.name


def upload_video(session) -> dict:
    """Generate + upload a test video. Returns {src, poster?}."""
    path = generate_test_video()
    try:
        with open(path, "rb") as f:
            files = {"file": ("test-video.mp4", f, "video/mp4")}
            r = session.post(f"{WEB_URL}/api/media", files=files, timeout=60)
        r.raise_for_status()
        media = r.json()["media"]
        # Wait briefly for BullMQ worker to transcode
        time.sleep(2)
        # Re-fetch to get updated variants
        m_id = media["id"]
        r2 = session.get(f"{WEB_URL}/api/media/{m_id}" if False else f"{API_URL}/api/media/{m_id}",
                         cookies=session.cookies, timeout=10)
        if r2.ok:
            media = r2.json()
        variants = media.get("variants") or {}
        src_path = variants.get("720p") or media.get("originalPath")
        attrs = {"src": f"{API_URL}{src_path}"}
        if variants.get("poster"):
            attrs["poster"] = f"{API_URL}{variants['poster']}"
        return attrs
    finally:
        try:
            os.unlink(path)
        except Exception:
            pass


def build_content_json(article, cover_url, body_urls, video_attrs, yt_id):
    """Build a TipTap-compatible content JSON."""
    nodes = []
    paras = article["paragraphs"]

    # P1
    nodes.append({
        "type": "paragraph",
        "content": [{"type": "text", "text": paras[0]}],
    })

    # First body image
    if body_urls:
        nodes.append({
            "type": "image",
            "attrs": {"src": body_urls[0]},
        })

    # P2
    if len(paras) > 1:
        nodes.append({
            "type": "paragraph",
            "content": [{"type": "text", "text": paras[1]}],
        })

    # YouTube embed
    if yt_id:
        nodes.append({
            "type": "youtube",
            "attrs": {
                "src": f"https://www.youtube.com/watch?v={yt_id}",
                "width": 640,
                "height": 360,
            },
        })

    # P3
    if len(paras) > 2:
        nodes.append({
            "type": "paragraph",
            "content": [{"type": "text", "text": paras[2]}],
        })

    # Second body image
    if len(body_urls) > 1:
        nodes.append({
            "type": "image",
            "attrs": {"src": body_urls[1]},
        })

    # Video upload
    if video_attrs:
        nodes.append({
            "type": "video",
            "attrs": video_attrs,
        })

    # Third body image (if 3)
    if len(body_urls) > 2:
        nodes.append({
            "type": "image",
            "attrs": {"src": body_urls[2]},
        })

    return {"type": "doc", "content": nodes}


def create_and_publish(session, article, idx):
    label = f"[{idx:02d}/20] {article['title'][:60]}..."
    print(label)

    # Upload cover
    cover_seed = f"news-{idx}-cover"
    cover_url = upload_image(session, cover_seed)

    # Upload body images
    body_urls = []
    for i in range(article["image_count"]):
        body_urls.append(upload_image(session, f"news-{idx}-body-{i}"))
        time.sleep(0.2)

    # Optional video upload
    video_attrs = None
    if article.get("video"):
        try:
            video_attrs = upload_video(session)
        except Exception as e:
            print(f"  ⚠ video upload failed: {e}; skipping")

    # YouTube embed
    yt_id = YT_IDS[idx % len(YT_IDS)] if article.get("youtube") else None

    content = build_content_json(article, cover_url, body_urls, video_attrs, yt_id)

    payload = {
        "title": article["title"],
        "excerpt": article["excerpt"],
        "coverImageUrl": cover_url,
        "contentJson": content,
        "seoTitle": article["title"][:60],
        "seoDesc": article["excerpt"][:160],
    }

    r = session.post(f"{WEB_URL}/api/posts", json=payload, timeout=30)
    r.raise_for_status()
    post = r.json()
    post_id = post["id"]

    # Publish
    r = session.post(f"{WEB_URL}/api/posts/{post_id}/publish", timeout=15)
    r.raise_for_status()

    return post


def main():
    print("=== Seeding 20 articles ===")
    session = login()
    print("✓ Logged in as admin")

    created = []
    for i, art in enumerate(ARTICLES, 1):
        try:
            post = create_and_publish(session, art, i)
            created.append(post)
            print(f"  ✓ Published: /{post.get('slug', '?')}")
        except Exception as e:
            print(f"  ✗ FAILED: {e}")
        time.sleep(0.5)

    print(f"\n=== Done: {len(created)}/20 published ===")


if __name__ == "__main__":
    main()
