import { chromium } from "npm:playwright";
import { Readability } from "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm"; // Adjust version as needed
import { JSDOM } from "jsdom"; // Adjust version as needed

(async () => {
  // Connect to the running Chrome instance using CDP
  const browser = await chromium.connectOverCDP("http://localhost:9222");

  // Open a new tab instead of a new page
  const context = await browser.newContext();
  const page = await context.newPage();

  const url =
    "https://www.wsj.com/politics/elections/robert-f-kennedy-jr-drops-out-of-presidential-race-endorses-trump-f043e9b9?mod=hp_lead_pos1";

  await page.goto(url);

  const articleContent = await page.evaluate(() => {
    return document.documentElement.innerHTML; // Get full HTML content
  });

  // Create a new Readability instance with the extracted HTML content
  const dom = new JSDOM(articleContent, {
    url: url,
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000,
  });

  const article = new Readability(dom.window.document).parse();

  if (article) {
    // Create a filename based on the authority segment
    const urlObject = new URL(url);
    const authoritySegment = urlObject.hostname;

    // Write extracted content to a Markdown file
    const markdownFilePath = `${authoritySegment}.md`;

    await Deno.writeTextFile(markdownFilePath, article.content);

    console.log(`Extracted content written to ${markdownFilePath}`);
  } else {
    console.error("Failed to extract article content.");
  }

  // Close the browser but leave Chrome running
  await browser.close();
})();
