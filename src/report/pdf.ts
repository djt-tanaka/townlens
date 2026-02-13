import path from "node:path";
import { chromium } from "playwright";
import { ensureDir } from "../utils";

export async function renderPdfFromHtml(html: string, outPath: string): Promise<void> {
  await ensureDir(path.dirname(outPath));

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "10mm",
        bottom: "14mm",
        left: "10mm"
      }
    });
  } finally {
    await browser.close();
  }
}
