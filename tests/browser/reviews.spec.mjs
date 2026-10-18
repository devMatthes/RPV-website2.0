import {test,expect} from '@playwright/test';
const fixture={name:'RPV Sp. z o.o.',placeId:'synthetic-place',rating:4.7,count:27,url:'https://www.google.com/maps?cid=123',reviews:[{author:'Autor testowy',rating:3,text:'Testowa opinia <img src=x onerror=alert(1)>',relativeDate:'miesiąc temu',url:'https://www.google.com/maps/reviews/test',authorUrl:'javascript:alert(1)',avatarUrl:'https://evil.test/avatar'}]};
test('real ratings and attribution appear only after a successful lazy fetch',async({page})=>{
 let calls=0;await page.route('**/api/reviews',route=>{calls++;return route.fulfill({json:fixture});});
 await page.goto('/');const section=page.locator('[data-google-reviews]');await expect(section).toBeHidden();expect(calls).toBe(0);
 await page.locator('[data-reviews-trigger]').scrollIntoViewIfNeeded();await expect(section).toBeVisible();expect(calls).toBe(1);
 await expect(section.locator('figure')).toHaveCount(1);await expect(section.locator('[data-review-stars]')).toHaveText('★★★☆☆');
 await expect(section.locator('[data-review-summary]')).toHaveText('4,7/5 · Liczba opinii: 27');
 await expect(section.locator('blockquote')).toHaveText(fixture.reviews[0].text);await expect(section.locator('blockquote img')).toHaveCount(0);
 await expect(section.locator('[data-review-author]')).toHaveAttribute('href',fixture.reviews[0].url);
 await expect(section.locator('[data-review-avatar]')).not.toHaveAttribute('src',/./);
 await page.locator('h1').scrollIntoViewIfNeeded();await page.locator('[data-reviews-trigger]').scrollIntoViewIfNeeded();expect(calls).toBe(1);
});
for(const [name,status,data] of [['provider failure',503,{message:'unavailable'}],['quota exhausted',429,{}],['empty reviews',200,{...fixture,reviews:[]}],['invalid reviews',200,{...fixture,reviews:[{...fixture.reviews[0],rating:9}]}]]) {
 test(`section stays fully hidden: ${name}`,async({page})=>{
  let calls=0;await page.route('**/api/reviews',route=>{calls++;return route.fulfill({status,json:data});});await page.goto('/');await page.locator('[data-reviews-trigger]').scrollIntoViewIfNeeded();
  await expect.poll(()=>calls).toBe(1);await expect(page.locator('[data-google-reviews]')).toBeHidden();await expect(page.locator('[data-google-reviews]')).toHaveCSS('display','none');
  await expect(page.getByText('Programista Senior',{exact:true})).toHaveCount(0);
 });
}
for(const width of [320,390,834,1440]) test(`review cards fit at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.route('**/api/reviews',route=>route.fulfill({json:{...fixture,reviews:Array.from({length:5},(_,i)=>({...fixture.reviews[0],author:`Autor ${i}`}))}}));
 await page.goto('/');await page.locator('[data-reviews-trigger]').scrollIntoViewIfNeeded();const section=page.locator('[data-google-reviews]');await expect(section).toBeVisible();
 const bounds=await section.boundingBox();expect(bounds.width).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await expect(section.locator('figure')).toHaveCount(5);await section.locator('.carousel').focus();await page.keyboard.press('ArrowRight');
});
