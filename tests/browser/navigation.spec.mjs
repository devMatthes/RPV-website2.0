import {test,expect} from '@playwright/test';

async function consent(page){if(await page.locator('.cookie-dialog[open]').count())await page.getByRole('button',{name:'Tylko niezbędne',exact:true}).click();}
const noOverflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

test('desktop navigation: hover, direct parent links, keyboard, dismissal and category URLs',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');await consent(page);
  const nav=page.getByRole('navigation',{name:'Główna nawigacja',exact:true});
  const services=nav.getByRole('link',{name:'Usługi',exact:true});
  const toggle=nav.getByRole('button',{name:'Pokaż podmenu Usługi',exact:true});
  await expect(toggle).toBeVisible();await services.hover();await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(nav.locator('#desktop-services a')).toHaveCount(7);
  const panel=nav.locator('#desktop-services');const bounds=await panel.boundingBox();expect(bounds.x+bounds.width).toBeLessThanOrEqual(1440);
  await nav.getByRole('link',{name:'Pompy ciepła',exact:true}).hover();await expect(panel).toBeVisible();
  if(process.env.NAVIGATION_SCREENSHOTS)await page.screenshot({path:'outputs/navigation-desktop.png'});
  await page.mouse.click(32,130);await expect(toggle).toHaveAttribute('aria-expanded','false');
  await services.focus();await services.press('ArrowDown');await expect(nav.getByRole('link',{name:'Wszystkie usługi',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(panel).toBeHidden();
  await services.click();await expect(page).toHaveURL(/\/uslugi\/$/);await expect(page.locator('h1')).toContainText('Usługi dla domu');
  await expect(page.locator('#uslugi article')).toHaveCount(6);await noOverflow(page);
  if(process.env.NAVIGATION_SCREENSHOTS)await page.screenshot({path:'outputs/services-desktop.png',fullPage:true});
  await nav.getByRole('link',{name:'Realizacje',exact:true}).hover();await nav.locator('#desktop-projects').getByRole('link',{name:'Fotowoltaika',exact:true}).click();
  await expect(page).toHaveURL(/\/realizacje\/\?kategoria=fotowoltaika$/);
  await expect(page.locator('[data-category=fotowoltaika]')).toHaveAttribute('aria-pressed','true');
  await nav.getByRole('link',{name:'Realizacje',exact:true}).click();await expect(page).toHaveURL(/\/realizacje\/$/);
});

test('mobile and tablet: separate disclosure, home link, no quote CTA and responsive widths',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [320,390,834,1099]){
    await page.setViewportSize({width,height:900});await page.goto('/uslugi/');await consent(page);await noOverflow(page);
    if(process.env.NAVIGATION_SCREENSHOTS&&width===390)await page.screenshot({path:'outputs/services-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'Menu',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Menu strony',exact:true});
    await expect(dialog.getByRole('link',{name:'Strona główna',exact:true})).toBeVisible();await expect(dialog.getByRole('link',{name:'Darmowa wycena',exact:true})).toHaveCount(0);
    const toggle=dialog.getByRole('button',{name:'Pokaż podmenu Usługi',exact:true});await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
    await expect(dialog.getByRole('link',{name:'Rozdzielnice i elektryka',exact:true})).toBeVisible();
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    if(process.env.NAVIGATION_SCREENSHOTS&&width===390)await page.screenshot({path:'outputs/navigation-mobile.png'});
    await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','false');
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeFocused();
  }
  for(const width of [1100,1280]){await page.setViewportSize({width,height:900});await noOverflow(page);await expect(page.getByRole('navigation',{name:'Główna nawigacja',exact:true})).toBeVisible();}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Menu',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Menu strony',exact:true});await dialog.getByRole('button',{name:'Pokaż podmenu Usługi',exact:true}).click();await dialog.getByRole('link',{name:'Magazyny energii',exact:true}).click();
  await expect(page).toHaveURL(/\/uslugi\/magazyny-energii\/$/);await expect(dialog).toBeHidden();expect(errors).toEqual([]);
});

test('services and project navigation remains usable without JavaScript on desktop',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:900}});const page=await context.newPage();
  try{
    await page.goto('/uslugi/');const nav=page.getByRole('navigation',{name:'Główna nawigacja',exact:true});await nav.getByRole('link',{name:'Usługi',exact:true}).focus();
    await expect(nav.getByRole('link',{name:'Pompy ciepła',exact:true})).toBeVisible();await nav.getByRole('link',{name:'Pompy ciepła',exact:true}).click();
    await expect(page).toHaveURL(/\/uslugi\/pompy-ciepla\/$/);await expect(page.getByRole('navigation',{name:'Okruszki',exact:true}).getByRole('link',{name:'Usługi',exact:true})).toHaveAttribute('href','/uslugi/');
  }finally{await context.close();}
});

test('touch navigation: tapping parent navigates and separate arrows reveal category links',async({browser,baseURL})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});const page=await context.newPage();
  try{
    await page.goto(`${baseURL}/`);await consent(page);await page.getByRole('button',{name:'Menu',exact:true}).tap();
    let dialog=page.getByRole('dialog',{name:'Menu strony',exact:true});await dialog.getByRole('link',{name:'Usługi',exact:true}).tap();
    await expect(page).toHaveURL(/\/uslugi\/$/);await page.getByRole('button',{name:'Menu',exact:true}).tap();
    dialog=page.getByRole('dialog',{name:'Menu strony',exact:true});await dialog.getByRole('button',{name:'Pokaż podmenu Realizacje',exact:true}).tap();
    await expect(dialog.getByRole('link',{name:'Magazyny energii',exact:true})).toBeVisible();await dialog.getByRole('link',{name:'Magazyny energii',exact:true}).tap();
    await expect(page).toHaveURL(/\/realizacje\/\?kategoria=magazyny-energii$/);await expect(page.locator('[data-category=magazyny-energii]')).toHaveAttribute('aria-pressed','true');
  }finally{await context.close();}
});
