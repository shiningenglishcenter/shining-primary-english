import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, BookOpenCheck, GraduationCap, Lightbulb, Send, Star } from "lucide-react";
import { GuideHeader } from "@/features/guide/header";
import { GuideOverview } from "@/features/guide/overview";
import { KIND_LABEL_VI, PRACTICE_KINDS, type PracticeKind } from "@/features/practice/model";

export const metadata: Metadata = {
  title: "Hướng dẫn sử dụng",
  description: "Hướng dẫn cho giáo viên và học sinh SHINING Primary English.",
};

/**
 * Public user guide (D37): teachers create and send practice, read results;
 * students play. Static page (no session), screenshots in /public/guide
 * taken from the app with [SAMPLE] data.
 */

const SIZES: Record<string, [number, number]> = {
  "t1-content": [1400, 941],
  "t2-topic": [1400, 941],
  "t3-words": [1400, 941],
  "t5-settings": [1400, 941],
  "t6-items": [1400, 941],
  "t7-media": [1400, 941],
  "t8-share": [1400, 941],
  "t10-voice": [896, 639],
  "r1-students": [1400, 941],
  "r2-matrix": [1400, 941],
  "r3-student": [1400, 941],
  "r4-hard": [1400, 941],
  "r5-activities": [1400, 941],
  "r6-guests": [1400, 941],
  "s1-login": [560, 953],
  "s2-home": [560, 953],
  "s3-topic": [560, 953],
  "s4-question": [560, 953],
  "s5-hint": [560, 953],
  "s6-right": [560, 953],
  "s7-finish": [560, 953],
  "s8-guest": [560, 953],
};

function Shot({ name, alt, className }: { name: string; alt: string; className?: string }) {
  const [w, h] = SIZES[name]!;
  return (
    <a
      href={`/guide/${name}.webp`}
      target="_blank"
      rel="noreferrer"
      title="Bấm để xem ảnh lớn"
      className={`block overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition hover:shadow-md ${className ?? ""}`}
    >
      <Image
        src={`/guide/${name}.webp`}
        alt={alt}
        width={w}
        height={h}
        unoptimized
        className="h-auto w-full"
      />
    </a>
  );
}

function Step({
  n,
  title,
  children,
  shot,
  important,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  shot?: React.ReactNode;
  important?: boolean;
}) {
  return (
    <li
      className={`grid gap-5 rounded-xl border p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${
        important ? "border-sun bg-sun-soft/60" : "border-line bg-surface"
      }`}
    >
      <div>
        <p className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white">
            {n}
          </span>
          <span className="text-lg font-semibold">{title}</span>
        </p>
        {important ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-sun px-2.5 py-0.5 text-xs font-semibold">
            <Star className="size-3" aria-hidden="true" /> Quan trọng
          </p>
        ) : null}
        <div className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed text-ink [&_b]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </div>
      {shot ? <div className="flex flex-col gap-3">{shot}</div> : null}
    </li>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg bg-sky-soft px-3 py-2 text-sm">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  intro,
  children,
}: {
  id: string;
  icon: typeof Send;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="flex items-center gap-3 text-2xl font-semibold">
        <Icon className="size-7 text-sky" aria-hidden="true" />
        {title}
      </h2>
      <p className="mt-2 mb-6 max-w-prose text-ink-soft">{intro}</p>
      <ol className="flex flex-col gap-5">{children}</ol>
    </section>
  );
}

const KIND_HELP: Record<PracticeKind, string> = {
  flashcards: "xem hình, nghe và đọc theo",
  listen_choose: "nghe từ, chọn đúng hình",
  look_choose: "nhìn hình, chọn đúng từ",
  match: "nối hình với từ",
  spell: "xếp chữ cái thành từ",
  true_false: "câu đúng hay sai với hình",
  fill_blank: "chọn từ điền chỗ trống",
  rearrange: "xếp các từ thành câu",
  listen_type: "nghe rồi gõ lại từ",
  listening: "xem video YouTube / nghe audio rồi trả lời",
  reading: "đọc đoạn văn ngắn rồi trả lời",
  mixed: "ghép 2–6 dạng trên thành một bài",
  match_meaning: "nối từ tiếng Anh với nghĩa tiếng Việt (không cần hình)",
  translate: "đọc câu, chọn nghĩa đúng (Anh → Việt hoặc Việt → Anh)",
  phonics: "nghe các từ, chọn từ có âm đang học (ví dụ /æ/)",
  write_answer: "dạng đề Cambridge: nhìn hình hoặc nghe câu, viết 1–3 từ",
  listen_colour: "dạng đề Cambridge: nghe, chạm đúng hình rồi chọn đúng màu",
};

export default function GuidePage() {
  return (
    <div className="min-h-dvh bg-paper">
      <GuideHeader />

      <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-[2.2rem] leading-tight font-semibold" data-testid="page-title">
            Hướng dẫn sử dụng SHINING
          </h1>
          <p className="mt-3 max-w-prose text-lg text-ink-soft">
            Ba việc chính: <b className="text-ink">soạn bài và gửi cho học sinh</b>,{" "}
            <b className="text-ink">xem kết quả</b>, và <b className="text-ink">học sinh làm bài</b>. Mỗi bước
            có ảnh minh hoạ — bấm vào ảnh để xem lớn.
          </p>
          <div className="mt-6">
            <GuideOverview />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["#soan-bai", Send, "Giáo viên", "Soạn bài và gửi link cho học sinh"],
                ["#ket-qua", BarChart3, "Giáo viên", "Xem ai đã làm, giỏi gì, yếu gì"],
                ["#hoc-sinh", GraduationCap, "Học sinh", "Đăng nhập và làm bài"],
              ] as const
            ).map(([href, Icon, who, what]) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-sky"
              >
                <Icon className="size-8 text-sky" aria-hidden="true" />
                <span>
                  <span className="block text-xs font-semibold text-ink-soft uppercase">{who}</span>
                  <span className="font-semibold">{what}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------ soạn bài */}
        <Section
          id="soan-bai"
          icon={BookOpenCheck}
          title="1. Giáo viên: soạn bài và gửi cho học sinh"
          intro="Bài luyện sắp theo Chương trình → Trình độ → Unit / Chủ đề → Bài. Học sinh chỉ thấy những gì đã Xuất bản. Sơ đồ các chương trình xem ở trang Giáo trình."
        >
          <Step
            n={1}
            title="Mở “Bài luyện”, chọn chương trình và trình độ"
            shot={<Shot name="t1-content" alt="Bảng unit của Global Success 1" />}
          >
            <p>
              Đăng nhập → tab <b>Bài luyện</b>. Chọn <b>Cambridge</b> hoặc <b>Global Success</b>, rồi chọn
              trình độ (Starters, G1…). Bảng cho biết mỗi unit có bao nhiêu từ, mẫu câu, bài luyện và trạng
              thái.
            </p>
            <ul>
              <li>
                Ô <b>Tìm</b> tìm theo tên unit hoặc theo từ (ví dụ “cat”).
              </li>
              <li>
                Bộ lọc <b>Cần hoàn thiện</b>: unit có từ thiếu hình, bài dưới 6 câu, chưa có mẫu câu hoặc chưa
                có bài.
              </li>
              <li>
                Tích chọn nhiều unit → <b>Thao tác</b> để xuất bản hoặc chuyển về nháp cùng lúc.{" "}
                <b>Thêm unit</b> tạo unit mới ở dạng nháp.
              </li>
            </ul>
          </Step>

          <Step
            n={2}
            title="Trong unit: 5 bước theo thứ tự"
            shot={<Shot name="t3-words" alt="Tab Từ vựng của Unit 9" />}
          >
            <p>
              <b>Thông tin → Từ vựng → Mẫu câu → Bài luyện → Chia sẻ.</b> Dấu ✓ cho biết bước đã xong; nút{" "}
              <b>Tiếp</b> ở cuối mỗi tab dẫn sang bước sau.
            </p>
            <ul>
              <li>
                <b>Từ vựng:</b> mỗi từ có nghĩa, hình và phiên âm. Bấm <b>Chọn hình</b> để tìm hình bằng tiếng
                Anh hoặc tiếng Việt, hoặc <b>Tải ảnh</b> (JPG/PNG, tối đa 2 MB). Mục{" "}
                <b>Nhập nhiều từ một lúc</b> để dán cả danh sách.
              </li>
              <li>
                <b>Mẫu câu:</b> câu tiếng Anh kèm nghĩa; học sinh thấy ở đầu trang unit, có giọng đọc.
              </li>
            </ul>
            <Tip>Chỉ từ có hình mới vào các trò chơi nhìn hình; từ thiếu hình vẫn có trong trò nối nghĩa.</Tip>
          </Step>

          <Step
            n={3}
            title="Danh sách bài của unit"
            shot={<Shot name="t2-topic" alt="Tab Bài luyện: danh sách bài, mức độ, trạng thái" />}
          >
            <ul>
              <li>
                Mỗi bài ghi dạng bài, mức độ <b>Dễ / Vừa / Thử thách</b>, kỹ năng và trạng thái. Học sinh lọc
                được bài theo mức độ.
              </li>
              <li>
                Kéo <b>⋮⋮</b> hoặc bấm mũi tên để đổi thứ tự học sinh thấy. Nút <b>Link</b> chép nhanh link
                gửi học sinh.
              </li>
              <li>
                Unit mới có từ vựng: bấm <b>Tạo nhanh</b> để có ngay các trò chơi từ vựng. Muốn thêm từng bài:
                chọn <b>Dạng bài mới</b> → <b>Thêm bài</b>.
              </li>
            </ul>
          </Step>

          <Step n={4} title={`Các dạng bài (${PRACTICE_KINDS.length} dạng)`}>
            <ul className="grid gap-1 sm:grid-cols-2">
              {PRACTICE_KINDS.map((k) => (
                <li key={k}>
                  <b>{KIND_LABEL_VI[k]}</b> — {KIND_HELP[k]}
                </li>
              ))}
            </ul>
            <Tip>
              Muốn một bài luyện nhiều kỹ năng (nghe → đọc → viết), dùng <b>Bài tổng hợp</b>.
            </Tip>
          </Step>

          <Step
            n={5}
            title="Soạn câu hỏi, xem trước và xuất bản"
            important
            shot={<Shot name="t6-items" alt="Trang soạn bài: tab Câu hỏi và khung xem trước" />}
          >
            <p>
              Trang bài có 3 tab: <b>Câu hỏi</b>, <b>Cài đặt</b>, <b>Chia sẻ</b>. Bên phải là khung{" "}
              <b>Xem trước</b>: bấm <b>Xem thử</b> để làm bài như học sinh (không ghi điểm).
            </p>
            <ul>
              <li>
                Mỗi câu: hình, câu tiếng Anh, đáp án. Ô <b>💡 Gợi ý</b> và <b>📘 Giải thích</b> không bắt buộc.
              </li>
              <li>
                Sửa đến đâu <b>tự lưu nháp</b> đến đó; học sinh chưa thấy thay đổi.
              </li>
              <li>
                Bấm <b>Xuất bản</b> (bài mới) hoặc <b>Cập nhật cho học sinh</b> (bài đang dùng) để học sinh thấy
                bản mới. <b>Chuyển về nháp</b> để tạm ẩn bài.
              </li>
            </ul>
          </Step>

          <Step
            n={6}
            title="Cài đặt khi học sinh trả lời sai"
            shot={<Shot name="t5-settings" alt="Tab Cài đặt: gợi ý, giải thích, số lần sai" />}
          >
            <ul>
              <li>
                Bật/tắt <b>gợi ý 💡</b> và <b>giải thích 📘</b> sau mỗi câu.
              </li>
              <li>
                Chọn sai mấy lần (1–5) thì hiện đáp án và sang câu tiếp. Câu Đúng/Sai chỉ được chọn 1 lần.
              </li>
              <li>
                Bài Đúng/Sai có thể dùng kiểu trả lời đầy đủ: <i>Is this a dog? → Yes, it is.</i>
              </li>
              <li>
                Điểm: đúng ngay <b>2 điểm</b>, đúng sau khi sai <b>1 điểm</b>, hết lượt <b>0</b>.
              </li>
            </ul>
          </Step>

          <Step
            n={7}
            title="Bài nghe: video YouTube hoặc audio"
            shot={<Shot name="t7-media" alt="Bài nghe: link YouTube hoặc file audio" />}
          >
            <ul>
              <li>
                Dán link YouTube <b>hoặc</b> tải file mp3/m4a/wav (tối đa 10 MB). Bài nghe theo sách Cambridge
                đã có sẵn audio gốc.
              </li>
              <li>
                Có thể cho câu hỏi mở sau khi học sinh nghe hết, hoặc từ một mốc thời gian.
              </li>
            </ul>
          </Step>

          <Step
            n={8}
            title="Giọng đọc: nghe, tự thu hoặc tải file"
            shot={<Shot name="t10-voice" alt="Bảng giọng đọc: Nghe, Thu âm, Tải file cho từng câu" />}
          >
            <p>
              App đọc từ và câu bằng giọng Emma (Anh–Anh). Mở mục <b>🔊 Giọng đọc</b> ở tab Mẫu câu (cả unit)
              hoặc ở cuối trang bài (riêng bài đó):
            </p>
            <ul>
              <li>
                <b>Nghe</b> thử từng câu. <b>Thu âm</b> giọng thầy cô (tối đa 60 giây), nghe lại rồi bấm{" "}
                <b>Lưu bản thu</b>, hoặc <b>Tải file</b> audio (tối đa 2 MB).
              </li>
              <li>
                Câu đã thay có nhãn <b>Giọng thầy cô</b>; bấm <b>Mặc định</b> để quay về giọng Emma.
              </li>
            </ul>
          </Step>

          <Step
            n={9}
            title="Gửi bài cho học sinh qua Zalo"
            important
            shot={<Shot name="t8-share" alt="Tab Chia sẻ: link, lời nhắn, làm không cần đăng nhập" />}
          >
            <p>
              Tab <b>Chia sẻ</b> của bài (hoặc của cả unit):
            </p>
            <ul>
              <li>
                <b>Sao chép link</b>, hoặc sửa <b>lời nhắn</b> rồi bấm <b>Sao chép lời nhắn</b> → dán vào
                Zalo. Lời nhắn được nhớ cho các bài sau; tên bài và link tự đổi.
              </li>
              <li>
                Bật <b>Cho làm không cần đăng nhập</b> để có link công khai: ai mở cũng làm được, chỉ cần nhập
                tên. Tắt công tắc hoặc tạo link mới là link cũ dừng ngay.
              </li>
            </ul>
          </Step>
        </Section>

        {/* ------------------------------------------------------------ kết quả */}
        <Section
          id="ket-qua"
          icon={BarChart3}
          title="2. Giáo viên: xem kết quả bài làm"
          intro="Tab Kết quả. Chọn Lớp, Xem theo, Thời gian (7 ngày, 30 ngày, tất cả) và Trình độ — đổi là lọc ngay. Bấm tiêu đề cột để sắp xếp. Điểm tính theo lần làm gần nhất; thẻ từ không tính điểm."
        >
          <Step
            n={1}
            title="Theo học sinh"
            shot={<Shot name="r1-students" alt="Bảng kết quả theo học sinh" />}
          >
            <ul>
              <li>
                Ô <b>Cả lớp hay sai</b> ở đầu trang: những từ/câu nhiều em sai nhất.
              </li>
              <li>Số bài đã làm (kèm sao), điểm trung bình, thời gian học, lần học gần nhất.</li>
              <li>
                <b>⚠ Cần chú ý:</b> 7 ngày không làm bài hoặc điểm trung bình dưới 50%.
              </li>
              <li>
                Bấm <b>Xem chi tiết</b> để mở trang của từng em.
              </li>
            </ul>
          </Step>
          <Step
            n={2}
            title="Theo chủ đề: bảng màu cả lớp"
            important
            shot={<Shot name="r2-matrix" alt="Bảng màu học sinh × chủ đề" />}
          >
            <ul>
              <li>Mỗi ô: điểm của học sinh ở unit đó và số bài đã làm.</li>
              <li>
                <b>Xanh</b> từ 80%, <b>vàng</b> 50–79%, <b>đỏ</b> dưới 50%, xám là chưa làm.
              </li>
              <li>Hàng cuối là trung bình lớp → unit đỏ/vàng nên dạy lại. Bấm vào ô để xem chi tiết.</li>
            </ul>
          </Step>
          <Step
            n={3}
            title="Chi tiết một học sinh"
            important
            shot={<Shot name="r3-student" alt="Trang chi tiết học sinh: kỹ năng, cần ôn, từ hay sai" />}
          >
            <ul>
              <li>
                <b>Kỹ năng:</b> Từ vựng, Nghe, Đọc, Viết.
              </li>
              <li>
                <b>Cần ôn lại:</b> các bài dưới 70%. <b>Từ / câu hay sai:</b> ví dụ “bear – sai 1/1 lần”, kèm
                dấu ✓ khi em đã luyện lại.
              </li>
              <li>
                <b>Lượt làm gần đây:</b> 10 lượt mới nhất, kèm câu em làm sai.
              </li>
              <li>
                <b>Theo chủ đề:</b> mở từng unit để xem mọi bài, kể cả bài chưa làm.
              </li>
            </ul>
          </Step>
          <Step n={4} title="Theo bài" shot={<Shot name="r5-activities" alt="Bảng kết quả theo bài" />}>
            <p>Bài khó nhất (điểm trung bình thấp nhất) ở trên cùng: bao nhiêu em đã làm và điểm trung bình.</p>
          </Step>
          <Step
            n={5}
            title="Từ / câu cả lớp hay sai"
            shot={<Shot name="r4-hard" alt="Danh sách từ và câu cả lớp hay sai" />}
          >
            <p>
              Xếp theo số học sinh làm sai. “Sai” là chưa đúng ngay lần đầu; “hết lượt” là phải xem đáp án. Dùng
              danh sách này để chọn từ/câu cần dạy lại.
            </p>
          </Step>
          <Step
            n={6}
            title="Link không cần đăng nhập"
            shot={<Shot name="r6-guests" alt="Bài làm qua link công khai" />}
          >
            <p>
              Tên trẻ tự nhập, bài, điểm, thời gian và lúc làm qua link công khai. Mục này không theo lớp; kết
              quả không vào tài khoản học sinh.
            </p>
          </Step>
        </Section>

        {/* ------------------------------------------------------------ học sinh */}
        <Section
          id="hoc-sinh"
          icon={GraduationCap}
          title="3. Học sinh: làm bài"
          intro="Dùng điện thoại, máy tính bảng hoặc máy tính. Bật loa để nghe đọc; nút EN | VI để đổi ngôn ngữ."
        >
          <Step
            n={1}
            title="Đăng nhập và chọn chủ đề"
            shot={
              <div className="grid grid-cols-3 gap-3">
                <Shot name="s1-login" alt="Màn hình đăng nhập" />
                <Shot name="s2-home" alt="Trang chủ: chọn chương trình, trình độ, chủ đề" />
                <Shot name="s3-topic" alt="Danh sách bài của chủ đề" />
              </div>
            }
          >
            <ul>
              <li>Nhập tên đăng nhập và mật khẩu thầy cô cấp (ví dụ hs.an).</li>
              <li>
                Chọn <b>Cambridge / Global Success</b> → trình độ → chủ đề → bài.
              </li>
              <li>Sao dưới mỗi chủ đề/bài cho biết con đã làm tốt đến đâu.</li>
            </ul>
          </Step>
          <Step
            n={2}
            title="Làm bài, dùng gợi ý"
            shot={
              <div className="grid grid-cols-3 gap-3">
                <Shot name="s4-question" alt="Một câu hỏi" />
                <Shot name="s5-hint" alt="Trả lời sai: còn lượt và nút gợi ý" />
                <Shot name="s6-right" alt="Trả lời đúng" />
              </div>
            }
          >
            <ul>
              <li>
                Bấm 🔊 để nghe lại. Sai thì thử lại; bấm 💡 <b>Gợi ý</b> nếu cần.
              </li>
              <li>Sai quá số lần cho phép: hiện đáp án và tự sang câu sau.</li>
              <li>Đúng ngay được +2, đúng sau khi sai được +1.</li>
            </ul>
          </Step>
          <Step
            n={3}
            title="Xem sao và làm tiếp"
            shot={
              <div className="grid grid-cols-3 gap-3">
                <Shot name="s7-finish" alt="Màn hình kết thúc với 3 sao" />
                <Shot name="s8-guest" alt="Làm bài qua link không cần đăng nhập: nhập tên" />
              </div>
            }
          >
            <ul>
              <li>
                Hết bài: sao, điểm, nút <b>Bài tiếp theo</b> / <b>Chơi lại</b>. Điểm được lưu tự động.
              </li>
              <li>
                Link <b>không cần đăng nhập</b>: con nhập tên rồi bấm <b>Bắt đầu</b>.
              </li>
            </ul>
          </Step>
        </Section>

        {/* ------------------------------------------------------------ hỏi đáp */}
        <section id="hoi-dap" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold">Hỏi đáp nhanh</h2>
          <dl className="mt-5 grid gap-4 md:grid-cols-2">
            {(
              [
                ["Quên mật khẩu?", "Nhờ quản trị viên vào Học sinh → tên em → Đặt lại mật khẩu."],
                [
                  "Không nghe thấy tiếng?",
                  "Kiểm tra nút loa trong bài (không bị gạch), âm lượng và chế độ im lặng của điện thoại.",
                ],
                ["Học sinh không thấy bài?", "Kiểm tra chủ đề và bài đều ở trạng thái Xuất bản."],
                [
                  "Link báo không mở được?",
                  "Link công khai đã bị tắt hoặc thay bằng link mới — gửi lại link mới.",
                ],
                [
                  "Điểm tính thế nào?",
                  "Mỗi câu 2/1/0 điểm; sao và kết quả theo lần làm gần nhất của mỗi bài.",
                ],
                [
                  "Video không phát?",
                  "Mở trang sửa bài, thay link YouTube khác (một số video không cho nhúng).",
                ],
              ] as const
            ).map(([q, a]) => (
              <div key={q} className="rounded-xl border border-line bg-surface p-4">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1 text-ink-soft">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-sun bg-sun-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">Cô đã dùng thử? Hãy cho chúng tôi biết!</p>
            <p className="text-ink-soft">Báo lỗi và chia sẻ ý tưởng từ lớp học — không cần đăng nhập.</p>
          </div>
          <Link
            href="/gop-y"
            className="inline-flex h-11 items-center rounded-md bg-ink px-5 font-semibold text-white"
            data-testid="guide-feedback"
          >
            💬 Gửi góp ý
          </Link>
        </div>
      </div>

      <footer className="border-t border-line bg-surface py-6 text-center text-sm text-ink-soft">
        SHINING Primary English · Ảnh minh hoạ dùng dữ liệu mẫu [SAMPLE].
      </footer>
    </div>
  );
}
