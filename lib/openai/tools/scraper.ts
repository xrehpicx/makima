import puppeteer from 'puppeteer';

export async function scrapeWebsiteContent(url: string): Promise<string> {
    // Launch headless browser
    const browser = await puppeteer.launch();

    // Open new page
    const page = await browser.newPage();

    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Get page content
    const pageContent = await page.content();

    // Close the browser
    await browser.close();

    // Return the page content
    return pageContent;
}