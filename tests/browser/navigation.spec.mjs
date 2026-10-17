import {test,expect} from '@playwright/test';

async function consent(page){if(await page.locator('.cookie-dialog[open]').count())await page.getByRole('button',{name:'Tylko niezbędne',exact:true}).click();}
const noOverflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

test('desktop navigation: hover, direct parent links, keyboard, dismissal and category URLs',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');await consent(page);
  const nav=page.getByRole('navigation',{name:'Główna nawigacja',exact:true});
  const services=nav.getByRole('link',{name:'Usługi',exact:true});
  const toggle=nav.locator('.nav-toggle').first();
  await expect(toggle).toBeHidden();await services.hover();await expect(services).toHaveAttribute('aria-expanded','true');
  await expect(nav.locator('#desktop-services .mega-primary a')).toHaveCount(6);
  const panel=nav.locator('#desktop-services');const bounds=await panel.boundingBox();expect(bounds.x).toBe(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(1440);
  expect(bounds.width).toBe(await page.evaluate(()=>document.documentElement.clientWidth));
  await expect(page.locator('[data-nav-scrim]')).toBeVisible();
  expect(await page.locator('[data-nav-scrim]').evaluate(el=>getComputedStyle(el).backdropFilter)).toContain('blur');
  await nav.getByRole('link',{name:'Pompy ciepła',exact:true}).hover();await expect(panel).toBeVisible();
  if(process.env.NAVIGATION_SCREENSHOTS)await page.screenshot({path:'outputs/navigation-desktop.png'});
  await services.focus();await page.locator('[data-nav-scrim]').click({position:{x:32,y:bounds.y+bounds.height+32}});await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('[data-nav-scrim]')).toBeHidden();await expect(page).toHaveURL(/\/$/);
  await services.focus();await services.press('ArrowDown');await expect(nav.locator('.mega-primary').getByRole('link',{name:'Fotowoltaika',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(services).toBeFocused();await expect(panel).toBeHidden();await expect(page.locator('[data-nav-scrim]')).toBeHidden();
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
    await page.getByRole('button',{name:'Menu',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Menu strony',exact:true});await expect(page.locator('[data-nav-scrim]')).toBeHidden();
    await expect(dialog.getByRole('link',{name:'Strona główna',exact:true})).toBeVisible();await expect(dialog.getByRole('link',{name:'Darmowa wycena',exact:true})).toHaveCount(0);
    const toggle=dialog.getByRole('button',{name:'Pokaż podmenu Usługi',exact:true});await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
    await expect(dialog.getByRole('link',{name:'Rozdzielnice i elektryka',exact:true})).toBeVisible();
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    if(process.env.NAVIGATION_SCREENSHOTS&&width===390)await page.screenshot({path:'outputs/navigation-mobile.png'});
    await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','false');
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeFocused();
  }
  for(const width of [1100,1280,1920,2560]){await page.setViewportSize({width,height:900});await noOverflow(page);const nav=page.getByRole('navigation',{name:'Główna nawigacja',exact:true});await expect(nav).toBeVisible();await nav.getByRole('link',{name:'Usługi',exact:true}).hover();const bounds=await nav.locator('#desktop-services').boundingBox();expect(bounds.x).toBe(0);expect(bounds.width).toBe(await page.evaluate(()=>document.documentElement.clientWidth));await page.keyboard.press('Escape');await expect(page.locator('[data-nav-scrim]')).toBeHidden();await noOverflow(page);}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Menu',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Menu strony',exact:true});await dialog.getByRole('button',{name:'Pokaż podmenu Usługi',exact:true}).click();await dialog.getByRole('link',{name:'Magazyny energii',exact:true}).click();
  await expect(page).toHaveURL(/\/uslugi\/magazyny-energii\/$/);await expect(dialog).toBeHidden();expect(errors).toEqual([]);
});

test('mega menu backdrop: switch sections, hover dismissal, scrolling and reduced transparency',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');await consent(page);
  const nav=page.getByRole('navigation',{name:'Główna nawigacja',exact:true}),scrim=page.locator('[data-nav-scrim]');
  await nav.getByRole('link',{name:'Usługi',exact:true}).hover();await expect(scrim).toBeVisible();
  await nav.getByRole('link',{name:'Realizacje',exact:true}).hover();await expect(nav.locator('#desktop-services')).toBeHidden();await expect(nav.locator('#desktop-projects')).toBeVisible();await expect(scrim).toBeVisible();
  if(process.env.NAVIGATION_SCREENSHOTS)await page.screenshot({path:'outputs/navigation-projects.png'});
  await page.mouse.move(24,800);await expect(scrim).toBeHidden();
  await nav.getByRole('link',{name:'Usługi',exact:true}).hover();await page.evaluate(()=>window.scrollTo(0,180));await expect(scrim).toBeHidden();await page.evaluate(()=>window.scrollTo(0,0));await page.mouse.move(24,800);
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
  await nav.getByRole('link',{name:'Usługi',exact:true}).hover();await expect(scrim).toBeVisible();expect(await scrim.evaluate(el=>getComputedStyle(el).backdropFilter)).toBe('none');
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

test('header hover is consistent across layouts and adjacent menu targets have no dead zone',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  for(const route of ['/','/o-nas/','/uslugi/']){
    await page.goto(route);await consent(page);
    const logo=page.locator('.header .home');await logo.hover();
    expect(await logo.evaluate(el=>getComputedStyle(el).textDecorationLine)).toBe('none');
    const nav=page.getByRole('navigation',{name:'Główna nawigacja',exact:true});
    const services=nav.getByRole('link',{name:'Usługi',exact:true}),projects=nav.getByRole('link',{name:'Realizacje',exact:true});
    await services.hover();expect(await services.evaluate(el=>getComputedStyle(el).textDecorationLine)).toBe('none');
    await expect(nav.getByText('Na skróty',{exact:true})).toHaveCount(0);
    expect(await nav.locator('#desktop-services').evaluate(el=>getComputedStyle(el).borderBottomWidth)).toBe('0px');
    const first=await services.boundingBox(),next=await projects.boundingBox();
    expect(Math.abs(first.x+first.width-next.x)).toBeLessThanOrEqual(1);
    await page.mouse.move(first.x+first.width-.5,first.y+first.height/2);await page.mouse.move(next.x+.5,next.y+next.height/2);
    await expect(projects).toHaveAttribute('aria-expanded','true');await expect(page.locator('[data-nav-scrim]')).toBeVisible();
    await expect(nav.locator('#desktop-services')).toBeHidden();
  }
});

test('animated menu can reverse and switch rapidly without leaving a blocking overlay; reduced motion skips it',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');await consent(page);
  const nav=page.getByRole('navigation',{name:'Główna nawigacja',exact:true});
  const services=nav.getByRole('link',{name:'Usługi',exact:true}),projects=nav.getByRole('link',{name:'Realizacje',exact:true});
  await services.hover();await page.mouse.move(24,800);
  await expect(services).toHaveAttribute('aria-expanded','false');
  await services.hover();await projects.hover();await services.hover();await services.focus();
  await services.press('ArrowDown');await expect(nav.locator('.mega-primary').getByRole('link',{name:'Fotowoltaika',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(nav.locator('#desktop-services')).toBeHidden();await expect(page.locator('[data-nav-scrim]')).toBeHidden();
  expect(await nav.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion:reduce)').matches);
  await projects.focus();
  await expect(nav.locator('#desktop-projects')).toBeVisible();
  // Global reduced-motion CSS retains 0.01 ms focus-outline transitions.
  expect(await nav.evaluate(el=>el.getAnimations({subtree:true}).filter(animation=>Number(animation.effect?.getTiming().duration)>1).length)).toBe(0);
  await page.keyboard.press('Escape');await expect(page.locator('[data-nav-scrim]')).toBeHidden();
});
