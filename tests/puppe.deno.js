import { Readability } from "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm"; // Adjust version as needed
import { JSDOM } from "jsdom"; // Adjust version as needed
// import puppeteer from "https://deno.land/x/puppeteer_plus/mod.ts";
import puppeteer from "https://deno.land/x/puppeteer_plus/core.ts";
const url = "https://example.com/";
// const url =
//   "https://www.wsj.com/politics/elections/robert-f-kennedy-jr-drops-out-of-presidential-race-endorses-trump-f043e9b9?mod=hp_lead_pos1";

(async () => {
  const browser = await puppeteer.connect({
    browserURL: "http://localhost:9222", // Connect to the existing Chrome instance
  });

  // Get the first page (or create a new one if necessary)
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2" });
  } catch (error) {
    console.error("Error navigating to the page:", error);
  }

  const articleContent = await page.content(); // Get full HTML content

  // Create a new Readability instance with the extracted HTML content
  const dom = new JSDOM(articleContent, {
    url: url,
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000,
  });

  const article = new Readability(dom.window.document).parse();

  if (!article) {
    console.error("Failed to extract article content.");
    return; // Exit early if extraction fails
  }

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

  // Create a CDP session for further interactions if needed
  const client = await page.target().createCDPSession();

  // Example of sending a command via CDP (optional)
  await client.send("Animation.enable"); // Enable animation tracking (example command)

  client.on("Animation.animationCreated", () => {
    console.log("Animation created!");
  });

  // Close the browser but leave Chrome running
  await browser.close();
})();
