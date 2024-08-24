const { chromium } = require("playwright"); // Or 'firefox' or 'webkit'.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const Readability = require("@mozilla/readability").Readability;

(async () => {
  // Connect to the running Chrome instance using CDP
  const browser = await chromium.connectOverCDP("http://localhost:9222");

  // Get the default context and page
  const defaultContext = browser.contexts()[0];

  //want to open a new tab instead of a new page
  const page = defaultContext.pages()[0];

  const url =
    "https://www.wsj.com/politics/elections/robert-f-kennedy-jr-drops-out-of-presidential-race-endorses-trump-f043e9b9?mod=hp_lead_pos1";
  // const url = "http://example.com/";
  await page.goto(url);
  // await page.goto(
  //   "https://github.com/azat-co/50-ts/blob/main/01-introduction.md"
  // );
  // await page.goto("https://mail.google.com/");
  // await page.goto("https://github.com/jichen-jay/LlamaEdge-0.13.2");

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
    const markdownFilePath = path.join(__dirname, `${authoritySegment}.md`);
    fs.writeFileSync(markdownFilePath, article.content);

    console.log(`Extracted content written to ${markdownFilePath}`);
  } else {
    console.error("Failed to extract article content.");
  }

  // want to close the tab opened above, but leave Chrome running
  await browser.close();
})();
