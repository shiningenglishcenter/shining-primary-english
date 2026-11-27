import { expect, test, type Page } from "@playwright/test";
import { loginFromScratch } from "./helpers";

/** D61–D62: phonics, listen and colour, look/listen and write (Movers pack, D60). */

async function open(page: Page, topic: string, activity: string) {
  await page.goto("/learn?level=movers");
  await page.getByTestId("topic").filter({ hasText: topic }).first().click();
  await page.getByTestId("activity").filter({ hasText: activity }).first().click();
  await expect(page.getByTestId("player")).toBeVisible();
}

test.describe("new activity kinds", () => {
  test("phonics: choose the word with the sound", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await open(page, "Animal world", "Sounds");
    await expect(page.getByTestId("phonics")).toContainText("/æ/");
    await page.locator("[data-testid=option][data-correct=true]").click();
    await expect(page.getByTestId("feedback-right")).toBeVisible();
  });

  test("listen and colour: the right thing in the right colour", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await open(page, "Exam practice: Listening", "Listen and colour");
    const things = page.getByTestId("colour-things");
    await expect(things.getByTestId("colour-thing")).not.toHaveCount(0);
    // a wrong thing first: one try lost, both choices cleared
    await page.locator("[data-testid=colour-thing]:not([data-correct])").first().click();
    await page.getByTestId("colour-swatch").first().click();
    await expect(page.getByTestId("feedback-wrong")).toBeVisible();
    const target = page.locator("[data-testid=colour-thing][data-correct=true]");
    const colour = (await target.getAttribute("data-colour"))!;
    await expect(page.getByTestId("colour-swatch").first()).toHaveAttribute("aria-pressed", "false");
    await target.click();
    await page.locator(`[data-testid=colour-swatch][data-colour=${colour}]`).click();
    await expect(page.getByTestId("feedback-right")).toBeVisible();
  });

  test("look and write: any listed answer counts", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await open(page, "Exam practice: Reading and Writing", "Look and write");
    const input = page.getByTestId("write-input");
    const answer = (await input.getAttribute("data-answer"))!;
    await input.fill(answer.toUpperCase() + ".");
    await page.getByTestId("check").click();
    await expect(page.getByTestId("feedback-right")).toBeVisible();
  });

  test("D64–D65: a missed word comes back in 'Ôn lại từ hay sai'; activities show how hard they are", async ({
    page,
  }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=movers");
    await page.getByTestId("topic").filter({ hasText: "Animal world" }).first().click();
    await expect(page.getByTestId("activity").first().getByTestId("difficulty")).toHaveText(/Easy|Dễ/);
    await expect(
      page.locator("[data-testid=activity][data-kind=mixed]").first().getByTestId("difficulty"),
    ).toHaveText(/Challenge|Thử thách/);
    // filter dropdown: only challenge activities, nothing done yet, then all again
    await page.getByTestId("activity-filter-select").selectOption("hard");
    for (const d of await page
      .locator("[data-testid=activity]:visible [data-testid=difficulty]")
      .allTextContents())
      expect(d).toMatch(/Challenge|Thử thách/);
    // "done": only finished activities (none on a fresh database, then the empty note)
    await page.getByTestId("activity-filter-select").selectOption("done");
    const done = await page
      .locator("li[data-activity]:visible")
      .evaluateAll((els) => els.map((e) => e.hasAttribute("data-done")));
    expect(done.every(Boolean)).toBe(true);
    if (done.length === 0) await expect(page.getByTestId("filter-empty")).toBeVisible();
    await page.getByTestId("activity-filter-select").selectOption("all");
    await page.getByTestId("activity").filter({ hasText: "Look and choose" }).first().click();
    // first question: a wrong answer before the right one; then the rest right
    let first = true;
    for (let guard = 0; guard < 20; guard++) {
      if (await page.getByTestId("finish").isVisible()) break;
      if (first) {
        await page.locator("[data-testid=option]:not([data-correct])").first().click();
        await expect(page.getByTestId("feedback-wrong")).toBeVisible();
        first = false;
      }
      await page.locator("[data-testid=option][data-correct=true]").click();
      await expect(page.getByTestId("feedback-right")).toBeVisible();
      await page.getByTestId("next").click();
    }
    await expect(page.getByTestId("finish")).toBeVisible();
    await page.goto("/learn?level=movers");
    await page.getByTestId("review-card").click();
    await expect(page.getByTestId("player")).toBeVisible();
  });
});
