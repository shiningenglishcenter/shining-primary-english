import { expect, test, type Browser, type Page } from "@playwright/test";
import { activityTab, loginFromScratch, openNewTopicForm, publishTopic, signInAs, topicTab } from "./helpers";

/** Teacher feedback, round 3 (ARCHITECTURE D46–D54). */

const run = Date.now().toString(36).slice(-5);
/** Letters only, so the words are writable in listen-and-write. */
const tag = run.replace(/\d/g, (d) => "abcdefghij"[Number(d)]!);

async function as(browser: Browser, login: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await loginFromScratch(page, login);
  return page;
}

test.describe("teacher feedback round 3", () => {
  test("a teacher builds every new kind of practice; a pupil plays them", async ({ browser }) => {
    test.setTimeout(150_000);
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/content?level=movers");
    const topicName = `Feelings ${run}`;
    const form = await openNewTopicForm(teacher);
    await form.getByLabel("Tên chủ đề (tiếng Anh)").fill(topicName);
    await form.getByLabel("Tên chủ đề (tiếng Việt)").fill("Cảm xúc");
    await form.getByLabel("Hình (dán emoji)").fill("😊");
    await form.getByRole("button", { name: "Tạo chủ đề (bản nháp)" }).click();
    await expect(teacher.getByTestId("page-title").locator("visible=true")).toHaveText(topicName);
    const topicUrl = teacher.url();

    // words (one with IPA), and the topic's sentence patterns
    for (const [emoji, word, vi] of [
      ["😊", `happy${tag}`, "vui"],
      ["😢", `sad${tag}`, "buồn"],
      ["😠", `angry${tag}`, "tức giận"],
    ]) {
      const add = teacher.getByTestId("add-word-form");
      await add.getByLabel("Emoji").fill(emoji!);
      await add.getByLabel("Từ mới", { exact: true }).fill(word!);
      await add.getByLabel("Nghĩa của từ mới").fill(vi!);
      await add.getByRole("button", { name: "Thêm từ" }).click();
      await expect(teacher.getByTestId("add-word-ok")).toContainText(word!);
    }
    for (const row of await teacher.getByTestId("word-row").all()) {
      await row.getByLabel(/^Phiên âm của /).fill("ˈhæpi");
      await row.getByRole("button", { name: "Lưu", exact: true }).click();
    }
    await topicTab(teacher, "patterns");
    const pe = teacher.getByTestId("patterns-editor").locator("visible=true");
    await pe.getByLabel("Mẫu câu 1 (tiếng Anh)").fill("I am happy.");
    await pe.getByLabel("Mẫu câu 1 (nghĩa)").fill("Tớ vui.");
    await pe.getByTestId("add-pattern").click();
    await pe.getByLabel("Mẫu câu 2 (tiếng Anh)").fill("Are you sad?");
    await pe.getByLabel("Mẫu câu 2 (nghĩa)").fill("Bạn có buồn không?");
    await pe.getByRole("button", { name: "Lưu mẫu câu" }).click();
    await expect(pe.getByTestId("form-success")).toHaveText("Đã lưu 2 mẫu câu.");
    await publishTopic(teacher);

    const af = () => teacher.getByTestId("activity-form").locator("visible=true");
    const addActivity = async (label: string) => {
      await teacher.goto(`${topicUrl}?tab=activities`);
      await teacher.getByLabel("Dạng bài mới").locator("visible=true").selectOption({ label });
      await teacher.getByRole("button", { name: "Thêm bài" }).locator("visible=true").click();
      await expect(af()).toBeVisible();
    };
    const publish = async () => {
      await af().getByRole("button", { name: "Xuất bản", exact: true }).click();
      await expect(af().getByTestId("form-success")).toHaveText("Đã lưu và xuất bản.");
    };

    await addActivity("Thẻ từ");
    await activityTab(teacher, "Cài đặt");
    await af().getByTestId("ipa-toggle").locator("input").check();
    await publish();

    await addActivity("Nghe và viết từ");
    await activityTab(teacher, "Cài đặt");
    await af().getByTestId("write-hint").selectOption("letters");
    await publish();

    await addActivity("Nối từ với nghĩa tiếng Việt");
    await publish();

    await addActivity("Chọn nghĩa của câu");
    await af().getByRole("button", { name: "Thêm câu" }).click();
    await af().getByLabel("Câu 1", { exact: true }).fill("I am happy.");
    await af().getByLabel("Đáp án đúng câu 1").fill("Tớ vui.");
    await af().getByLabel("Đáp án sai 1 câu 1").fill("Tớ buồn.");
    await af().getByLabel("Đáp án sai 2 câu 1").fill("Tớ đói.");
    await af().getByLabel("Giải thích câu 1").fill("“I am” nghĩa là “tớ là / tớ đang”.");
    await publish();

    await addActivity("Đúng hay sai?");
    await activityTab(teacher, "Cài đặt");
    await af().getByTestId("yes-no-style").selectOption("full");
    await activityTab(teacher, "Câu hỏi");
    await af().getByRole("button", { name: "Thêm câu" }).click();
    await af().getByLabel("Câu 1", { exact: true }).fill("This is a happy face.");
    await expect(af().getByTestId("full-answer-preview")).toContainText("Is this a happy face?");
    await publish();

    // ---- the pupil
    const kid = await as(browser, "hs.an");
    await kid.goto("/learn?level=movers");
    await kid.getByTestId("topic").filter({ hasText: topicName }).click();
    await expect(kid.getByTestId("patterns")).toContainText("I am happy.");
    await kid.getByTestId("patterns-meaning").click();
    await expect(kid.getByTestId("pattern-vi").first()).toHaveText("Tớ vui.");
    const open = async (kind: string) => {
      await kid.goto("/learn?level=movers");
      await kid.getByTestId("topic").filter({ hasText: topicName }).click();
      await kid.locator(`[data-testid=activity][data-kind=${kind}]`).click();
      await expect(kid.getByTestId("player")).toBeVisible();
    };

    await open("flashcards");
    await expect(kid.getByTestId("flash-ipa")).toHaveText("/ˈhæpi/");

    await open("listen_type");
    const answer = (await kid.getByTestId("type-input").getAttribute("data-answer"))!;
    await expect(kid.getByTestId("tile")).toHaveCount(answer.length + 3);
    for (const ch of answer)
      await kid.locator(`[data-testid=tile][data-letter="${ch}"]:not([disabled])`).first().click();
    await expect(kid.getByTestId("feedback-right")).toBeVisible();

    await open("match_meaning");
    await expect(kid.getByTestId("page-title").locator("visible=true")).toHaveText("Match the meanings");
    await expect(kid.getByTestId("match-picture").first()).toHaveText(/vui|buồn|tức giận/);

    await open("translate");
    await expect(kid.getByTestId("page-title").locator("visible=true")).toHaveText("What does it mean?");
    await kid.locator("[data-testid=option][data-correct=true]").click();
    await expect(kid.getByTestId("explanation")).toContainText("I am");

    await open("true_false");
    await expect(kid.getByTestId("sentence")).toHaveText("Is this a happy face?");
    await expect(kid.locator("[data-testid=option][data-correct=true]")).toHaveText(/Yes, it is\./);
  });

  test("video questions wait until the pupil has watched", async ({ browser }) => {
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/content?level=movers");
    const topicName = `Songs ${run}`;
    const form = await openNewTopicForm(teacher);
    await form.getByLabel("Tên chủ đề (tiếng Anh)").fill(topicName);
    await form.getByLabel("Tên chủ đề (tiếng Việt)").fill("Bài hát");
    await form.getByRole("button", { name: "Tạo chủ đề (bản nháp)" }).click();
    await publishTopic(teacher);
    await topicTab(teacher, "activities");
    await teacher
      .getByLabel("Dạng bài mới")
      .locator("visible=true")
      .selectOption({ label: "Nghe (video / audio)" });
    await teacher.getByRole("button", { name: "Thêm bài" }).locator("visible=true").click();
    const af = teacher.getByTestId("activity-form").locator("visible=true");
    await af.getByTestId("youtube-input").fill("https://youtu.be/dQw4w9WgXcQ");
    await af.getByTestId("listening-gate").locator("input").check();
    await af.getByRole("button", { name: "Thêm câu Đúng/Sai" }).click();
    await af.getByLabel("Câu 1", { exact: true }).fill("The song is happy.");
    await af.getByRole("button", { name: "Xuất bản", exact: true }).click();
    await expect(af.getByTestId("form-success")).toHaveText("Đã lưu và xuất bản.");

    const kid = await (await browser.newContext()).newPage();
    await kid.clock.install();
    await loginFromScratch(kid, "hs.an");
    await kid.goto("/learn?level=movers");
    await kid.getByTestId("topic").filter({ hasText: topicName }).click();
    await kid.getByTestId("activity").first().click();
    await expect(kid.getByTestId("watch-first")).toBeVisible();
    await expect(kid.getByTestId("option")).toHaveCount(0);
    // No playing time reported here (no YouTube offline): the fallback button appears after 20 s.
    await kid.clock.fastForward(21_000);
    await kid.getByTestId("watched").click();
    await expect(kid.getByTestId("option")).toHaveCount(2);
  });

  test("Global Success term reviews draw words from their units", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=g1");
    await page.getByTestId("topic").filter({ hasText: "Review 1" }).click();
    await page.locator("[data-testid=activity][data-kind=look_choose]").click();
    await expect(page.getByTestId("progress-text")).toHaveText("1/8");
  });

  test("the login screen remembers usernames, never passwords @mobile", async ({ page }) => {
    await page.goto("/login");
    await signInAs(page, "hs.an");
    await expect(page).not.toHaveURL(/\/login/);
    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/login");
    await expect(page.getByLabel("Tên đăng nhập")).toHaveValue("hs.an");
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  });

  test("a teacher writes a comment on a unit and copies the message for parents", async ({ browser }) => {
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/results");
    const sample = await teacher
      .locator("select[name=class] option", { hasText: "SAMPLE-MOV-A" })
      .first()
      .getAttribute("value");
    await teacher.goto(`/teacher/results?class=${sample}&days=all`);
    await teacher
      .getByTestId("result-row")
      .filter({ hasText: "Nguyễn Minh An" })
      .getByTestId("student-detail-link")
      .click();
    const block = teacher.getByTestId("topic-block").first();
    await block.locator("summary").first().click();
    const box = block.getByTestId("topic-comment");
    await box.getByLabel("Nhận xét gửi phụ huynh").fill(`Con làm bài chăm chỉ ${run}.`);
    await box.getByRole("button", { name: "Lưu nhận xét" }).click();
    await expect(box.getByTestId("form-success")).toHaveText("Đã lưu nhận xét.");
    await box.locator("details summary").click();
    await expect(box.getByTestId("parent-message")).toContainText("Nguyễn Minh An");
    await expect(box.getByTestId("parent-message")).toContainText(
      `Nhận xét của thầy cô: Con làm bài chăm chỉ ${run}.`,
    );
    await teacher.reload();
    await teacher.getByTestId("topic-block").first().locator("summary").first().click();
    await expect(teacher.getByTestId("topic-block").first().getByLabel("Nhận xét gửi phụ huynh")).toHaveValue(
      `Con làm bài chăm chỉ ${run}.`,
    );
  });
});
