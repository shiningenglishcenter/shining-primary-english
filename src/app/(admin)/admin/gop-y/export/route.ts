import { requireRole } from "@/lib/auth/session";
import {
  FEEDBACK_AREAS,
  FEEDBACK_KINDS,
  ROLES,
  SEVERITIES,
  STATUSES,
  labelOf,
} from "@/features/feedback/labels";
import { listFeedback } from "@/features/feedback/queries";

/** CSV of every feedback item (one row per item; ratings and comments on each row). */
export async function GET() {
  await requireRole("admin");
  const rows = await listFeedback();
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Thời gian",
    "Tên",
    "Vai trò",
    "Liên hệ",
    "Trang",
    "Trạng thái góp ý",
    "Dễ soạn bài",
    "Học sinh thích",
    "Kết quả hữu ích",
    "Sẵn sàng dùng",
    "Loại",
    "Phần",
    "Mức độ",
    "Mô tả",
    "Các bước",
    "Số ảnh",
    "Trạng thái mục",
    "Thích nhất",
    "Muốn thay đổi",
    "Ghi chú admin",
  ];
  const lines = [header.map(cell).join(",")];
  for (const f of rows) {
    const base = [
      f.createdAt,
      f.name,
      labelOf(ROLES, f.role),
      f.contact,
      f.pageUrl,
      labelOf(STATUSES, f.status),
      f.ratings.ease,
      f.ratings.kids,
      f.ratings.results,
      f.ratings.ready,
    ];
    const tail = [f.liked, f.change, f.adminNote];
    const items = f.items.length ? f.items : [null];
    for (const i of items) {
      lines.push(
        [
          ...base,
          i ? labelOf(FEEDBACK_KINDS, i.kind) : "",
          i ? labelOf(FEEDBACK_AREAS, i.area) : "",
          i?.severity ? labelOf(SEVERITIES, i.severity) : "",
          i?.description,
          i?.steps,
          i?.screenshots.length ?? 0,
          i ? labelOf(STATUSES, i.status) : "",
          ...tail,
        ]
          .map(cell)
          .join(","),
      );
    }
  }
  // BOM so Excel opens Vietnamese text correctly.
  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gop-y-shining-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
