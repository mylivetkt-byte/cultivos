const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER_REQUEST_FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Wait a second for initial load
  await new Promise(r => setTimeout(r, 2000));
  
  // Click on 'Conceptos de Nómina' or something that triggers the view
  // Wait, in Sidebar.jsx it might be rendered. Let's just evaluate JS to change state.
  await page.evaluate(() => {
    // There is no easy way to trigger it without clicking.
    // Let's find the link for 'rrhh_conceptos' and click it.
  });
  
  // Actually, we can just click the sidebar item containing "Conceptos de Nómina"
  const elements = await page.$x("//span[contains(text(), 'Conceptos de Nómina')]");
  if (elements.length > 0) {
    console.log("Clicking on Conceptos de Nómina");
    await elements[0].click();
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log("Could not find Conceptos de Nómina in sidebar");
  }

  await browser.close();
})();
