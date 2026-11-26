import { expect, test } from "@playwright/test";
import { confirmDialog, loginFromScratch, topicTab } from "./helpers";

/** D67: a teacher replaces the voice of one sentence of an activity, then goes back. */
test("a teacher uploads their own voice for one sentence, then goes back to the default", async ({
  page,
}) => {
  await loginFromScratch(page, "gv.lan");
  await page.goto("/teacher/content?level=movers");
  await page.getByTestId("topic-search").fill("Animal world");
  await page
    .getByTestId("topic-row")
    .filter({ hasText: "Animal world" })
    .first()
    .getByRole("link")
    .first()
    .click();
  await topicTab(page, "activities");
  await page
    .getByTestId("activity-row")
    .filter({ hasText: "Đúng hay sai" })
    .first()
    .getByRole("link")
    .click();

  const panel = page.getByTestId("voice-panel");
  await panel.locator("summary").click();
  const row = panel.getByTestId("voice-row").first();
  await expect(row).toBeVisible();
  await row.getByTestId("voice-upload").click();
  await page.locator("[data-testid=voice-panel] input[type=file]").setInputFiles({
    name: "me.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("ID3 sample voice"),
  });
  await expect(row.getByText("Giọng thầy cô")).toBeVisible();
  await expect(panel.locator("summary")).toContainText("1 câu thầy cô tự thu");

  await row.getByTestId("voice-reset").click();
  await confirmDialog(page);
  await expect(row.getByText("Giọng thầy cô")).toHaveCount(0);
});
