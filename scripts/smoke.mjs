import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8080';
const maps = ['Greenfields', 'Crystal Lake', 'Under World', 'The Void'];
const seededSave = JSON.stringify({ version: 2, xp: 25000, energy: 200, energyAt: Date.now(), chamberStates: {}, artifacts: [], discoveries: [], worldFinds: [], muted: true, hasSave: true });
const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await desktop.addInitScript((save) => localStorage.setItem('chillverse-save-v1', save), seededSave);
await desktop.goto(base, { waitUntil: 'networkidle' });
await desktop.getByRole('button', { name: /Begin expedition|Continue/ }).click();
await desktop.waitForTimeout(500);
for (const map of maps) {
  const card = desktop.getByRole('button', { name: new RegExp(map) }).first();
  await card.click();
  await desktop.waitForTimeout(700);
  const canvas = desktop.locator('canvas');
  if (await canvas.count() !== 1) throw new Error(`${map}: canvas missing`);
  await desktop.screenshot({ path: `/tmp/chillverse-${map.toLowerCase().replaceAll(' ', '-')}.png` });
  await desktop.keyboard.press('ArrowUp');
  await desktop.waitForTimeout(180);
  await desktop.keyboard.up('ArrowUp');
  await desktop.getByRole('button', { name: 'Atlas' }).click();
  await desktop.waitForTimeout(250);
}
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await mobile.addInitScript((save) => localStorage.setItem('chillverse-save-v1', save), seededSave);
await mobile.goto(base, { waitUntil: 'networkidle' });
await mobile.getByRole('button', { name: /Continue|Begin expedition/ }).click();
await mobile.getByRole('button', { name: /The Void/ }).click();
await mobile.waitForTimeout(700);
if (await mobile.locator('canvas').count() !== 1) throw new Error('mobile: canvas missing');
const joystick = mobile.getByLabel('Move');
if (await joystick.count() !== 1) throw new Error('mobile: joystick missing');
await joystick.dispatchEvent('pointerdown', { pointerId: 1, clientX: 65, clientY: 780 });
await joystick.dispatchEvent('pointermove', { pointerId: 1, clientX: 95, clientY: 750 });
await joystick.dispatchEvent('pointerup', { pointerId: 1, clientX: 95, clientY: 750 });
await mobile.screenshot({ path: '/tmp/chillverse-mobile.png' });
console.log(`smoke ok: ${maps.length} maps + mobile joystick`);
await browser.close();
