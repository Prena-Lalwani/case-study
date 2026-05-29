import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
const logs = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => logs.push(m.type().toUpperCase() + ': ' + m.text()));

await page.goto('http://localhost:5174/onboarding/step-1', { waitUntil: 'networkidle' });

console.log('--- Page Errors ---');
if (errors.length) errors.forEach(e => console.log(e));
else console.log('(none)');

console.log('--- Console Logs ---');
logs.filter(l => l.startsWith('ERROR') || l.startsWith('WARN')).forEach(l => console.log(l));

// Check root content
const rootHTML = await page.evaluate(() => {
  const r = document.getElementById('root');
  return `children: ${r.children.length}, innerHTML length: ${r.innerHTML.length}`;
});
console.log('--- Root ---', rootHTML);

// Check key elements exist and their size
const checks = ['.flex.flex-col', 'header', 'main', 'aside'];
for (const sel of checks) {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return `${s}: NOT FOUND`;
    const r = el.getBoundingClientRect();
    const st = window.getComputedStyle(el);
    return `${s}: ${r.width.toFixed(0)}x${r.height.toFixed(0)} display=${st.display} visibility=${st.visibility} overflow=${st.overflow}`;
  }, sel);
  console.log(info);
}

await browser.close();
