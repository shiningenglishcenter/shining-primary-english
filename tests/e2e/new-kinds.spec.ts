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
});
