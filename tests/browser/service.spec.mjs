import {test,expect} from '@playwright/test';import sharp from 'sharp';
async function consent(page){if(await page.locator('.cookie-dialog[open]').count())await page.getByRole('button',{name:'Tylko niezbędne',exact:true}).click();}
async function fill(page,name='Klient QA'){for(const [field,value] of Object.entries({name,phone:'515 114 676',email:'qa@example.com',street:'Testowa',building:'12A',postcode:'00-001',city:'Warszawa',commune:'Warszawa',county:'Warszawa',message:'Problem QA — falownik.'}))await page.locator(`[name=${field}]`).fill(value);await page.locator('[name=province]').selectOption('mazowieckie');await page.locator('[name=installation]').selectOption('Fotowoltaika');await page.locator('[name=privacy]').check();}
const noOverflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
test('responsive form → persisted case → private admin attachment, status, note and logout',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [320,390,834,1440]){await page.setViewportSize({width,height:900});await page.goto('/serwis/');await consent(page);await page.getByRole('button',{name:'Wyślij zgłoszenie',exact:true}).click();await expect(page.locator('[aria-invalid=true]').first()).toBeVisible();await fill(page);await noOverflow(page);await expect(page.locator('[name=phone]')).toHaveAttribute('inputmode','tel');await expect(page.locator('[name=name]')).toHaveAttribute('autocomplete','section-service name');}
 const buffer=await sharp({create:{width:3600,height:2800,channels:3,background:'#4455cc'}}).png().toBuffer();await page.locator('#service-files').setInputFiles({name:'photo.png',mimeType:'image/png',buffer});await expect(page.getByRole('button',{name:'Usuń photo.jpg',exact:true})).toBeVisible();await expect.poll(()=>page.locator('.file-list img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);expect(await page.locator('.file-list img').evaluate(image=>image.naturalWidth)).toBeLessThanOrEqual(128);await page.getByRole('button',{name:'Wyślij zgłoszenie',exact:true}).click();await expect(page.locator('.form-feedback')).toContainText('zostało zapisane');
 await page.goto('/panel/');await page.locator('[name=username]').fill('qa-admin');await page.locator('[name=password]').fill('qa-local-test-password');await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await page.locator('[data-live-cases] a').filter({hasText:'Klient QA'}).click();await expect(page.locator('[data-detail-view]')).toBeVisible();await expect(page.locator('[data-address]')).toContainText('Warszawa');await expect.poll(()=>page.locator('[data-attachments] img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);await page.locator('[data-manage-form] [name=status]').selectOption('active');await page.locator('[name=note]').fill('Notatka QA');await page.getByRole('button',{name:'Zapisz zmiany',exact:true}).click();await expect(page.locator('[data-admin-feedback]')).toHaveText('Zmiany zapisane.');await expect(page.locator('[data-history]')).toContainText('Notatka QA');
 for(const width of [320,390,834,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);}
 await page.getByRole('button',{name:'Otwórz zdjęcie',exact:true}).click();await expect(page.locator('.live-image-dialog')).toBeVisible();await page.locator('.live-image-dialog').getByRole('button',{name:'Zamknij',exact:true}).click();await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await expect(page.locator('[data-login-view]')).toBeVisible();expect((await page.request.get('/api/admin/cases')).status()).toBe(401);expect(errors).toEqual([]);
});
test('Google UI minimum/debounce/keyboard selection and lost server response retry',async({page})=>{
 let suggestions=0,details=0,failOnce=true;const keys=[];
 await page.route('**/api/config',route=>route.fulfill({json:{googlePlaces:true}}));await page.route('**/api/address/suggestions',route=>{suggestions++;return route.fulfill({json:{suggestions:[{id:'test-place',text:'Testowa 12A, Warszawa'}]}});});await page.route('**/api/address/details',route=>{details++;return route.fulfill({json:{address:{street:'Testowa',building:'12A',postcode:'00-001',city:'Warszawa',commune:'Warszawa',county:'Warszawa',province:'mazowieckie'}}});});
 await page.goto('/serwis/');await consent(page);const search=page.locator('#address-search');await expect(search).toBeVisible();await search.fill('Wa');await page.waitForTimeout(500);expect(suggestions).toBe(0);await search.fill('Warszawa');await expect(page.locator('#address-suggestions [role=option]')).toBeVisible();expect(suggestions).toBe(1);expect(details).toBe(0);await search.press('ArrowDown');await search.press('Enter');await expect(page.locator('[name=commune]')).toHaveValue('Warszawa');expect(details).toBe(1);await fill(page,'Klient retry');
 await page.route('**/api/service',async route=>{keys.push(route.request().headers()['idempotency-key']);if(failOnce){failOnce=false;const response=await route.fetch();expect(response.status()).toBe(201);return route.abort('failed');}return route.continue();});await page.getByRole('button',{name:'Wyślij zgłoszenie',exact:true}).click();await expect(page.locator('.form-feedback')).toContainText('pozostają');await expect(page.locator('[name=name]')).toHaveValue('Klient retry');await page.getByRole('button',{name:'Wyślij zgłoszenie',exact:true}).click();await expect(page.locator('.form-feedback')).toContainText('zostało zapisane');expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
});
test('lazy validator network failure retains form and shows a recoverable error',async({page})=>{const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.route('**/*service-schema*.js',route=>route.abort());await page.goto('/serwis/');await consent(page);await fill(page,'Offline QA');await page.getByRole('button',{name:'Wyślij zgłoszenie',exact:true}).click();await expect(page.locator('.form-feedback')).toContainText('załadować walidacji');await expect(page.locator('[name=name]')).toHaveValue('Offline QA');expect(errors).toEqual([]);});

test('attachments stay lazy, HEIC converts locally, PDFs stay unchanged, and batches fail atomically',async({page})=>{
 const requested=[];const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requested.push(request.url()));
 await page.setViewportSize({width:390,height:844});await page.goto('/serwis/');await consent(page);
 expect(requested.some(url=>url.includes('heic2any')||url.includes('browser-image-compression'))).toBe(false);
 await page.locator('#service-files').setInputFiles('tests/fixtures/sample.heic');
 await expect(page.getByRole('button',{name:'Usuń sample.jpg',exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('.file-list img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
 expect(await page.locator('iframe[title="Przygotowanie zdjęcia"]').count()).toBe(0);
 expect(requested.some(url=>url.includes('heic2any'))).toBe(true);
 const nativeJpeg=await sharp({create:{width:64,height:64,channels:3,background:'#aaccff'}}).jpeg().toBuffer();
 await page.locator('#service-files').setInputFiles({name:'native.heic',mimeType:'image/jpeg',buffer:nativeJpeg});
 await expect(page.getByRole('button',{name:'Usuń native.jpg',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Usuń native.jpg',exact:true}).click();
 const pdf=Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
 await page.locator('#service-files').setInputFiles({name:'document.pdf',mimeType:'application/pdf',buffer:pdf});
 await expect(page.getByRole('button',{name:'Usuń document.pdf',exact:true})).toBeVisible();
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#aaccff'}}).png().toBuffer();
 await page.locator('#service-files').setInputFiles([{name:'valid.png',mimeType:'image/png',buffer:png},{name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('broken')}]);
 await expect(page.locator('#file-error')).toContainText('Ta partia nie została dodana');
 expect(await page.getByRole('button',{name:'Usuń valid.jpg',exact:true}).count()).toBe(0);
 await expect(page.getByRole('button',{name:'Usuń sample.jpg',exact:true})).toBeVisible();
 await page.locator('#service-files').setInputFiles({name:'too-big.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(5*1024*1024+1)});
 await expect(page.locator('#file-error')).toContainText('5 MB');
 await noOverflow(page);
 await page.getByRole('button',{name:'Usuń sample.jpg',exact:true}).click();await page.getByRole('button',{name:'Usuń document.pdf',exact:true}).click();
 await expect(page.locator('.file-list li')).toHaveCount(0);expect(errors).toEqual([]);
});

test('cancel delayed compressor load releases the form without sending originals',async({page})=>{
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#aaccff'}}).png().toBuffer();
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/*browser-image-compression*.js',async route=>{await gate;await route.continue().catch(()=>{});});
 await page.goto('/serwis/');await consent(page);
 await page.locator('#service-files').setInputFiles({name:'cancel.png',mimeType:'image/png',buffer:png});
 await expect(page.getByRole('button',{name:'Anuluj przygotowanie',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Anuluj przygotowanie',exact:true}).click();
 await expect(page.locator('.file-progress')).toContainText('anulowane');
 await expect(page.getByRole('button',{name:'Wyślij zgłoszenie',exact:true})).toBeEnabled();
 await expect(page.locator('.file-list li')).toHaveCount(0);release();
 let releaseHEIC;const heicGate=new Promise(resolve=>releaseHEIC=resolve);
 await page.route('**/*heic2any*.js',async route=>{if(route.request().frame()===page.mainFrame())return route.continue();await heicGate;await route.continue().catch(()=>{});});
 await page.locator('#service-files').setInputFiles('tests/fixtures/sample.heic');
 await expect(page.locator('iframe[title="Przygotowanie zdjęcia"]')).toHaveCount(1);
 await page.getByRole('button',{name:'Anuluj przygotowanie',exact:true}).click();
 await expect(page.locator('iframe[title="Przygotowanie zdjęcia"]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Wyślij zgłoszenie',exact:true})).toBeEnabled();releaseHEIC();
});

test('Access auto-login, expired session recovery and provider logout',async({page})=>{
 let expired=false;
 await page.route('**/api/config',route=>route.fulfill({json:{admin:true,auth:'access',submissions:false}}));
 await page.route('**/api/admin/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(expired)return route.fulfill({status:401,body:'Session expired'});
  if(path.endsWith('/me'))return route.fulfill({json:{username:'Administrator'}});
  if(path.endsWith('/logout'))return route.fulfill({json:{ok:true,redirect:'/cdn-cgi/access/logout'}});
  return route.fulfill({json:{cases:[],total:0,page:1,pageSize:12,counts:{serwis:0,kontakt:0}}});
 });
 await page.route('**/cdn-cgi/access/logout',route=>route.fulfill({contentType:'text/html',body:'<p>Wylogowano z Access</p>'}));
 await page.goto('/panel/');
 await expect(page.locator('[data-list-view]')).toBeVisible();
 await expect(page.locator('[data-admin-name]')).toHaveText('Administrator');
 await expect(page.locator('[data-login-form]')).toBeHidden();
 expired=true;await page.locator('[data-refresh]').click();
 await expect(page.locator('[data-login-view]')).toBeVisible();
 await expect(page.getByRole('link',{name:'Zaloguj się kodem na e-mail'})).toBeVisible();
 await expect(page.locator('[data-login-form]')).toBeHidden();
 expired=false;await page.getByRole('link',{name:'Zaloguj się kodem na e-mail'}).click();
 await expect(page.locator('[data-list-view]')).toBeVisible();
 await page.locator('[data-logout]:visible').click();
 await expect(page).toHaveURL(/\/cdn-cgi\/access\/logout$/);
 await expect(page.getByText('Wylogowano z Access')).toBeVisible();
});
