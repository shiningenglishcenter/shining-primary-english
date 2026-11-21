import { expect, test, type Browser, type Page } from "@playwright/test";
import { activityTab, loginFromScratch, openNewTopicForm, topicTab } from "./helpers";

/** D55 (programmes in the database) and D56 (the new practice editor). */

const run = Date.now().toString(36).slice(-5);
const tag = run.replace(/\d/g, (d) => "abcdefghij"[Number(d)]!);

async function as(browser: Browser, login: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await loginFromScratch(page, login);
  return page;
}

test.describe("practice editor (D56)", () => {
  test("programme and level tabs, topic step tabs, many words at once, reorder, preview", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/content");
    const programs = teacher.getByTestId("program-tabs");
    await expect(programs.getByRole("link", { name: /Cambridge/ })).toHaveAttribute("aria-current", "page");
    await programs.getByRole("link", { name: /Global Success/ }).click();
    await expect(teacher.getByTestId("level-tabs").getByRole("link", { name: /G3/ })).toBeVisible();
    await teacher
      .getByTestId("program-tabs")
      .getByRole("link", { name: /Cambridge/ })
      .click();
    await teacher
      .getByTestId("level-tabs")
      .getByRole("link", { name: /Movers/ })
      .click();
    await expect(teacher).toHaveURL(/level=movers/);

    // search finds a topic by one of its words
    await teacher.goto("/teacher/content?level=starters");
    await teacher.getByTestId("topic-search").fill("meo");
    await expect(teacher.getByTestId("topic-row").first()).toContainText("Animals");

    // a new topic from the dialog
    await teacher.goto("/teacher/content?level=movers");
    const form = await openNewTopicForm(teacher);
    const topicName = `Toys ${run}`;
    await form.getByLabel("Tên chủ đề (tiếng Anh)").fill(topicName);
    await form.getByLabel("Tên chủ đề (tiếng Việt)").fill("Đồ chơi");
    await form.getByLabel("Hình (dán emoji)").fill("🧸");
    await form.getByRole("button", { name: "Tạo chủ đề (bản nháp)" }).click();
    await expect(teacher.getByTestId("page-title").locator("visible=true")).toHaveText(topicName);

    // words: many at once (IPA filled in for known words), then one with IPA typed
    const bulk = teacher.getByTestId("bulk-words").locator("visible=true");
    await bulk.locator("summary").click();
    await bulk
      .getByTestId("bulk-words-input")
      .fill(`ball${tag} | quả bóng | ⚽\nkite${tag} | con diều | 🪁\nrobot${tag} | người máy | 🤖`);
    await bulk.getByRole("button", { name: "Thêm các từ" }).click();
    await expect(bulk.getByTestId("form-success")).toContainText("Đã thêm 3 từ");
    await expect(teacher.getByTestId("word-row")).toHaveCount(3);
    const add = teacher.getByTestId("add-word-form");
    await add.getByLabel("Emoji").fill("🐱");
    await add.getByLabel("Từ mới", { exact: true }).fill("cat");
    await add.getByLabel("Nghĩa của từ mới").fill("con mèo");
    await expect(add.getByTestId("new-word-ipa")).toBeVisible();
    await add.getByRole("button", { name: "Thêm từ" }).click();
    await expect(teacher.getByTestId("add-word-ok")).toContainText("cat");
    // left empty: filled from the IPA list
    await expect(teacher.getByLabel("Phiên âm của cat")).toHaveValue("kæt");
    await expect(teacher.getByTestId("tab-words")).toContainText("4");
    // remove it again: a level holds each word once, and the test runs again
    teacher.once("dialog", (d) => void d.accept());
    await teacher.getByRole("button", { name: "Xoá từ cat" }).click();
    await expect(teacher.getByTestId("word-row")).toHaveCount(3);

    // activities: quick create, then reorder with the arrows
    await topicTab(teacher, "activities");
    const next = teacher.getByTestId("next-step").locator("visible=true");
    await next.getByTestId("quick-create").click();
    await expect(next.getByTestId("form-success")).toContainText("Đã tạo 5 bài nháp");
    const rows = teacher.getByTestId("activity-row");
    await expect(rows).toHaveCount(5);
    const first = (await rows.first().getByTestId("activity-title").textContent())!;
    await rows.first().getByRole("button", { name: /xuống/ }).click();
    await expect(teacher.getByText("Đã lưu thứ tự.")).toBeVisible();
    await teacher.reload();
    await expect(teacher.getByTestId("activity-row").nth(1)).toContainText(first);

    // the activity editor: tabs, preview from the draft, save bar
    await teacher.getByTestId("activity-row").filter({ hasText: "Nhìn hình chọn từ" }).locator("a").click();
    await expect(teacher.getByTestId("activity-tabs").locator("visible=true")).toBeVisible();
    await teacher.getByTestId("preview-start").locator("visible=true").click();
    await expect(
      teacher.getByTestId("activity-preview").locator("visible=true").getByTestId("option").first(),
    ).toBeVisible();
    await activityTab(teacher, "Cài đặt");
    await expect(teacher.getByTestId("play-settings").locator("visible=true")).toBeVisible();
    const af = teacher.getByTestId("activity-form").locator("visible=true");
    await af.getByRole("button", { name: "Lưu & xuất bản" }).click();
    await expect(af.getByTestId("form-success")).toHaveText("Đã lưu và xuất bản.");
    await expect(af.getByTestId("save-bar")).toContainText("Đang xuất bản");
  });
});

test.describe("programmes and levels (D55)", () => {
  test("an admin adds a programme with a level; it shows as tabs, then is hidden again", async ({
    browser,
  }) => {
    const admin = await as(browser, "admin@example.com");
    await admin.goto("/admin/content");
    await admin.getByRole("link", { name: /Quản lý chương trình/ }).click();
    await expect(admin).toHaveURL(/\/admin\/programs$/);
    await expect(admin.getByTestId("program-section").filter({ hasText: "Global Success" })).toBeVisible();

    const np = admin.getByTestId("new-program-form");
    await np.getByLabel("Tên chương trình").fill(`Family ${tag}`);
    await np.getByLabel(/^Mã/).fill(`fam_${tag}`);
    await np.getByLabel("Gọi chủ đề là").selectOption("unit");
    await np.getByRole("button", { name: "+ Thêm chương trình" }).click();
    const section = admin.getByTestId("program-section").filter({ hasText: `Family ${tag}` });
    await expect(section).toBeVisible();

    const nl = section.getByTestId("new-level-form");
    await nl.getByLabel("Tên trình độ").fill(`Family ${tag} 1`);
    await nl.getByLabel("Tên trên tab").fill("F1");
    await nl.getByLabel("Mã", { exact: true }).fill(`F${tag.toUpperCase()}`);
    await nl.getByLabel("Đường dẫn").fill(`f-${tag}`);
    await nl.getByRole("button", { name: "+ Thêm" }).click();
    await expect(section.getByTestId("level-form")).toHaveCount(1);

    await admin.goto(`/admin/content?level=f-${tag}`);
    await expect(
      admin.getByTestId("program-tabs").getByRole("link", { name: new RegExp(`Family ${tag}`) }),
    ).toHaveAttribute("aria-current", "page");
    await expect(admin.getByTestId("add-topic")).toHaveText(/Thêm unit/);

    // hide it again so the other tests see only the usual programmes
    await admin.goto("/admin/programs");
    const pf = admin
      .getByTestId("program-section")
      .filter({ hasText: `Family ${tag}` })
      .getByTestId("program-form");
    await pf.getByLabel("Trạng thái").selectOption("draft");
    await pf.getByRole("button", { name: "Lưu" }).click();
    await expect(pf.getByTestId("form-success")).toBeVisible();
    await admin.goto("/admin/content");
    await expect(admin.getByTestId("program-tabs")).not.toContainText(`Family ${tag}`);
  });
});
