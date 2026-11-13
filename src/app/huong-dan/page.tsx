import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, BookOpenCheck, GraduationCap, Lightbulb, LogIn, Send, Star } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { KIND_LABEL_VI, PRACTICE_KINDS } from "@/features/practice/model";

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
  "t3-activities": [968, 1646],
  "t5-settings": [1400, 316],
  "t6-items": [1400, 868],
  "t7-media": [1400, 503],
  "t8-share": [1400, 468],
  "t9-guest": [1400, 764],
  "r1-students": [1400, 941],
  "r2-matrix": [1400, 941],
  "r3-student": [1400, 941],
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

const KIND_HELP: Record<string, string> = {
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
};

export default function GuidePage() {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/huong-dan" aria-label="Hướng dẫn sử dụng">
            <Logo subtitle={false} />
          </Link>
          <nav aria-label="Mục lục" className="hidden gap-1 text-sm font-semibold md:flex">
            <a href="#soan-bai" className="rounded-md px-3 py-2 hover:bg-muted">
              Soạn & gửi bài
            </a>
            <a href="#ket-qua" className="rounded-md px-3 py-2 hover:bg-muted">
              Xem kết quả
            </a>
            <a href="#hoc-sinh" className="rounded-md px-3 py-2 hover:bg-muted">
              Học sinh làm bài
            </a>
            <a href="#hoi-dap" className="rounded-md px-3 py-2 hover:bg-muted">
              Hỏi đáp
            </a>
          </nav>
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Đăng nhập
          </Link>
        </div>
      </header>

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
          intro="Bài luyện được sắp theo Chương trình → Trình độ → Chủ đề (Unit) → Bài. Học sinh chỉ thấy những gì đã Xuất bản."
        >
          <Step
            n={1}
            title="Mở “Bài luyện” và chọn trình độ"
            shot={<Shot name="t1-content" alt="Danh sách chủ đề của Starters" />}
          >
            <p>
              Đăng nhập → tab <b>Bài luyện</b>. Chọn <b>Cambridge</b> hoặc <b>Global Success</b>, rồi chọn
              trình độ (Starters, G1…).
            </p>
            <ul>
              <li>
                Bấm tên một chủ đề để sửa, hoặc kéo xuống cuối trang để <b>thêm chủ đề mới</b>.
              </li>
              <li>Chủ đề mới là bản nháp — học sinh chưa thấy cho đến khi Xuất bản.</li>
            </ul>
          </Step>

          <Step
            n={2}
            title="Trong chủ đề: từ vựng và danh sách bài"
            shot={<Shot name="t2-topic" alt="Trang chủ đề: từ vựng, thông tin chủ đề, bài luyện" />}
          >
            <ul>
              <li>
                <b>Từ vựng:</b> nhập từ, nghĩa và dán một emoji làm hình (ví dụ 🐈). Các trò chơi từ vựng lấy
                từ ở đây.
              </li>
              <li>
                <b>Thông tin chủ đề:</b> tên, hình, thứ tự và trạng thái <b>Xuất bản</b>.
              </li>
              <li>
                <b>Bài luyện:</b> danh sách bài của chủ đề; chọn <b>Dạng bài mới</b> → <b>Thêm bài</b>.
              </li>
            </ul>
            <Tip>Mỗi bài trong danh sách có nút 🔗 Link để chép nhanh link gửi học sinh.</Tip>
          </Step>

          <Step n={3} title="Chọn dạng bài (12 dạng)">
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
            n={4}
            title="Soạn nội dung, gợi ý và xuất bản"
            shot={
              <>
                <Shot name="t6-items" alt="Soạn câu hỏi: câu, đáp án, gợi ý" />
                <Shot name="t5-settings" alt="Cài đặt khi học sinh trả lời sai" />
              </>
            }
          >
            <ul>
              <li>
                Mỗi câu: hình (emoji), câu tiếng Anh, đáp án; ô <b>💡 Gợi ý</b> không bắt buộc (bỏ trống thì
                hệ thống tự gợi ý).
              </li>
              <li>
                <b>Khi học sinh trả lời sai:</b> bật/tắt gợi ý và chọn sai mấy lần thì hiện đáp án rồi sang
                câu (mặc định 3).
              </li>
              <li>
                Điểm: đúng ngay <b>2 điểm</b>, đúng sau khi sai <b>1 điểm</b>, hết lượt <b>0</b>.
              </li>
              <li>
                Chọn trạng thái <b>Xuất bản</b> → <b>Lưu bài</b>.
              </li>
            </ul>
          </Step>

          <Step
            n={5}
            title="Bài nghe: video YouTube hoặc audio của thầy cô"
            shot={<Shot name="t7-media" alt="Dán link YouTube hoặc tải file audio" />}
          >
            <ul>
              <li>
                Dán link YouTube (youtube.com/watch?v=… hoặc youtu.be/…), <b>hoặc</b> tải file mp3/m4a/wav
                (tối đa 10 MB).
              </li>
              <li>Thêm câu Đúng/Sai hoặc chọn đáp án về nội dung bài nghe.</li>
            </ul>
          </Step>

          <Step
            n={6}
            title="Gửi bài cho học sinh qua Zalo"
            important
            shot={<Shot name="t8-share" alt="Ô link gửi phụ huynh / học sinh và lời nhắn" />}
          >
            <p>
              Ở đầu trang của bài (đã xuất bản) có ô <b>Link gửi phụ huynh / học sinh</b>:
            </p>
            <ul>
              <li>
                <b>Sao chép link</b> — gửi link cho phụ huynh.
              </li>
              <li>
                Hoặc sửa <b>lời nhắn</b> rồi bấm <b>Sao chép lời nhắn</b> → dán vào Zalo. Lời nhắn được nhớ
                cho các bài sau; tên bài và link tự đổi.
              </li>
              <li>Học sinh mở link → đăng nhập (nếu chưa) → vào thẳng bài.</li>
            </ul>
            <Tip>Trang chủ đề cũng có ô này để gửi cả chủ đề.</Tip>
          </Step>

          <Step
            n={7}
            title="Cho làm không cần đăng nhập"
            important
            shot={<Shot name="t9-guest" alt="Công tắc cho làm không cần đăng nhập và link công khai" />}
          >
            <ul>
              <li>
                Bật công tắc <b>Cho làm không cần đăng nhập</b> (mặc định tắt) → có link công khai, ai mở cũng
                làm được, chỉ cần nhập tên.
              </li>
              <li>
                Link không hết hạn. Tắt công tắc hoặc bấm <b>Tạo link mới</b> là link cũ dừng ngay.
              </li>
              <li>Điểm không vào tài khoản học sinh; xem ở Kết quả → “Link không cần đăng nhập”.</li>
            </ul>
          </Step>
        </Section>

        {/* ------------------------------------------------------------ kết quả */}
        <Section
          id="ket-qua"
          icon={BarChart3}
          title="2. Giáo viên: xem kết quả bài làm"
          intro="Tab Kết quả. Chọn Lớp, Xem theo, Thời gian, Trình độ — đổi là lọc ngay. Bấm tiêu đề cột để sắp xếp. Điểm tính theo lần làm gần nhất."
        >
          <Step
            n={1}
            title="Theo học sinh"
            shot={<Shot name="r1-students" alt="Bảng kết quả theo học sinh" />}
          >
            <ul>
              <li>Số bài đã làm (số lượt, sao), điểm trung bình, thời gian học, lần học gần nhất.</li>
              <li>
                <b>⚠ Cần chú ý:</b> 7 ngày không làm bài hoặc điểm trung bình dưới 50%.
              </li>
              <li>Bấm tên học sinh để xem chi tiết.</li>
            </ul>
          </Step>
          <Step
            n={2}
            title="Theo chủ đề: bảng màu cả lớp"
            important
            shot={<Shot name="r2-matrix" alt="Bảng màu học sinh x chủ đề" />}
          >
            <ul>
              <li>Mỗi ô: điểm của học sinh ở chủ đề đó và số bài đã làm.</li>
              <li>
                <b>Xanh</b> từ 80%, <b>vàng</b> 50–79%, <b>đỏ</b> dưới 50%, xám là chưa làm.
              </li>
              <li>Hàng cuối là trung bình lớp → chủ đề đỏ/vàng nên dạy lại.</li>
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
                <b>Kỹ năng:</b> Từ vựng, Nghe, Đọc, Viết — kỹ năng yếu nhất được đánh dấu.
              </li>
              <li>
                <b>Cần ôn lại:</b> các bài dưới 70%. <b>Từ / câu hay sai:</b> ví dụ “giraffe – sai 2/3 lần”.
              </li>
              <li>
                <b>Theo chủ đề:</b> bấm để mở từng bài, kể cả bài chưa làm, với điểm lần đầu → gần nhất.
              </li>
            </ul>
          </Step>
          <Step n={4} title="Theo bài" shot={<Shot name="r5-activities" alt="Bảng kết quả theo bài" />}>
            <p>Bài khó nhất ở trên cùng: bao nhiêu em đã làm và điểm trung bình.</p>
          </Step>
          <Step
            n={5}
            title="Link không cần đăng nhập"
            shot={<Shot name="r6-guests" alt="Bài làm qua link công khai" />}
          >
            <p>Tên trẻ tự nhập, bài, điểm, thời gian và lúc làm qua link công khai.</p>
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

      <footer className="border-t border-line bg-surface py-6 text-center text-sm text-ink-soft">
        SHINING Primary English · Ảnh minh hoạ dùng dữ liệu mẫu [SAMPLE].
      </footer>
    </div>
  );
}
