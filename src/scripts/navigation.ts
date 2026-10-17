const desktop=matchMedia('(min-width:1100px)');
const hover=matchMedia('(hover:hover) and (pointer:fine)');
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
const animations=new Map<HTMLElement,Animation[]>();
const leaveTimers=new Map<HTMLElement,ReturnType<typeof setTimeout>>();
const groups=[...document.querySelectorAll<HTMLElement>('[data-has-submenu]')];
const header=document.querySelector<HTMLElement>('.header');
const scrim=document.querySelector<HTMLElement>('[data-nav-scrim]');
let backdropAnimation:Animation|undefined;
let backdropClosing=false;
function animateBackdrop(open:boolean,panel:HTMLElement) {
  if(!scrim)return;
  const from=backdropAnimation?getComputedStyle(scrim).clipPath:`inset(0px 0px ${open?innerHeight:0}px 0px)`;
  backdropAnimation?.cancel();
  backdropClosing=!open;
  const to=`inset(0px 0px ${open?0:Math.max(0,innerHeight-panel.getBoundingClientRect().bottom)}px 0px)`;
  const animation=scrim.animate([{clipPath:from},{clipPath:to}],{duration:open?360:240,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
  backdropAnimation=animation;
  void animation.finished.then(()=>{if(backdropAnimation===animation&&open){animation.cancel();backdropAnimation=undefined;}}).catch(()=>{/* Reversed or dismissed. */});
}
function syncBackdrop() {
  const open=desktop.matches&&groups.some(group=>(group.hasAttribute('data-open')||group.hasAttribute('data-closing'))&&group.closest('.navigation--desktop'));
  if(open&&header)header.style.setProperty('--nav-bottom',`${Math.max(0,header.getBoundingClientRect().bottom)}px`);
  header?.toggleAttribute('data-mega-open',open);
  if(scrim)scrim.hidden=!open;
  if(!open){backdropAnimation?.cancel();backdropAnimation=undefined;backdropClosing=false;}
}
function setOpen(group:HTMLElement,open:boolean,immediate=false,switching=false) {
  clearTimeout(leaveTimers.get(group));
  const wasOpen=group.hasAttribute('data-open');
  const backdropWasOpen=header?.hasAttribute('data-mega-open');
  const running=animations.get(group);
  if(wasOpen===open&&!immediate)return;
  const panel=group.querySelector<HTMLElement>('.mega-panel');
  const animate=panel&&desktop.matches&&!reducedMotion.matches&&!immediate;
  // Read the current frame before cancelling so a quick reversal stays continuous.
  const current=panel&&running?getComputedStyle(panel):null;
  const from=current?{clipPath:current.clipPath,opacity:current.opacity,transform:current.transform}:null;
  const rows=panel?[...panel.querySelectorAll<HTMLElement>('.mega-primary,.mega-secondary')].flatMap(column=>[...column.querySelectorAll<HTMLElement>('.mega-label,li')].map((element,row)=>({element,row}))):[];
  const rowFrames=rows.map(({element})=>{const style=getComputedStyle(element);return {opacity:style.opacity,transform:style.transform};});
  animations.delete(group);
  running?.forEach(animation=>animation.cancel());
  group.toggleAttribute('data-open',open);
  group.toggleAttribute('data-closing',!open&&!!animate);
  if(panel)panel.inert=!open;
  group.querySelector<HTMLButtonElement>('.nav-toggle')?.setAttribute('aria-expanded',String(open));
  if(group.closest('.navigation--desktop'))group.querySelector<HTMLAnchorElement>('.nav-link')?.setAttribute('aria-expanded',String(open));
  syncBackdrop();
  if(!animate)return;
  if(open&&(!backdropWasOpen||backdropClosing))animateBackdrop(true,panel);
  if(!open&&!groups.some(other=>other!==group&&other.closest('.navigation--desktop')&&other.hasAttribute('data-open')))animateBackdrop(false,panel);
  const collapsed={clipPath:'inset(0 0 100% 0)',opacity:0,transform:'translateY(-8px)'};
  const expanded={clipPath:'inset(0 0 0% 0)',opacity:1,transform:'translateY(0)'};
  const active:Animation[]=switching?[]:[panel.animate([from??(open?collapsed:expanded),open?expanded:collapsed],{duration:open?360:220,delay:open?0:340,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'})];
  const lastRow=Math.max(...rows.map(({row})=>row));
  rows.forEach(({element,row},index)=>{
    const hidden={opacity:0,transform:switching?'translateY(0)':'translateY(-6px)'};
    const visible={opacity:1,transform:'translateY(0)'};
    active.push(element.animate([running?rowFrames[index]:open?hidden:visible,open?visible:hidden],{duration:switching?160:open?220:160,delay:switching?0:(open?row*24:240+(lastRow-row)*24),easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
  });
  animations.set(group,active);
  void Promise.all(active.map(animation=>animation.finished)).then(()=>{
    if(animations.get(group)!==active)return;
    animations.delete(group);
    group.removeAttribute('data-closing');
    active.forEach(animation=>animation.cancel());
    syncBackdrop();
  }).catch(()=>{/* A new pointer or keyboard action superseded this animation. */});
}
const closeAll=()=>groups.forEach(group=>setOpen(group,false));
document.querySelectorAll<HTMLElement>('[data-dropdown-nav]').forEach(nav=>{nav.dataset.enhanced='true';});
groups.forEach(group=>{
  const button=group.querySelector<HTMLButtonElement>('.nav-toggle')!;
  const link=group.querySelector<HTMLAnchorElement>('.nav-link')!;
  const links=[...group.querySelectorAll<HTMLAnchorElement>('.nav-submenu a')];
  const open=()=>{
    const others=groups.filter(other=>other!==group);
    const switching=desktop.matches&&!!group.closest('.navigation--desktop')&&others.some(other=>other.closest('.navigation--desktop')&&(other.hasAttribute('data-open')||other.hasAttribute('data-closing')));
    // Keep the surface and backdrop open; only fade new content on category changes.
    setOpen(group,true,false,switching);
    others.forEach(other=>setOpen(other,false,true));
  };
  button.hidden=false;
  button.addEventListener('click',()=>{if(group.hasAttribute('data-open'))setOpen(group,false);else open();});
  group.addEventListener('pointerenter',()=>{if(desktop.matches&&hover.matches)open();});
  group.addEventListener('pointerleave',()=>{if(desktop.matches&&!group.contains(document.activeElement))leaveTimers.set(group,setTimeout(()=>setOpen(group,false),120));});
  link.addEventListener('focus',()=>{if(desktop.matches)open();});
  group.addEventListener('focusout',event=>{
    // During native pointer focus changes activeElement can briefly be body.
    // relatedTarget keeps the submenu open when moving from its button to a link.
    if(!(event.relatedTarget instanceof Node)||!group.contains(event.relatedTarget))setOpen(group,false);
  });
  group.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&group.hasAttribute('data-open')){event.preventDefault();event.stopPropagation();(desktop.matches?link:button).focus();setOpen(group,false);}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&(event.target===button||event.target===link)){
      event.preventDefault();open();(event.key==='ArrowDown'?links[0]:links.at(-1))?.focus();
    }
  });
});
document.addEventListener('pointerdown',event=>{if(event.target===scrim)return;groups.forEach(group=>{if(event.target instanceof Node&&!group.contains(event.target))setOpen(group,false);});});
scrim?.addEventListener('click',closeAll);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&desktop.matches){closeAll();}});
window.addEventListener('scroll',()=>{if(desktop.matches)closeAll();},{passive:true});
const menu=document.querySelector<HTMLDialogElement>('.mobile-menu');
const trigger=document.querySelector<HTMLButtonElement>('[data-menu-open]');
let previousOverflow='';
trigger?.addEventListener('click',()=>{if(menu&&!menu.open){closeAll();previousOverflow=document.body.style.overflow;menu.showModal();document.body.style.overflow='hidden';}});
const closeMenu=()=>menu?.close();
menu?.querySelector('[data-menu-close]')?.addEventListener('click',closeMenu);
// Let the link's default navigation run before hiding its dialog and restoring focus.
menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setTimeout(closeMenu,0)));
menu?.addEventListener('close',()=>{closeAll();document.body.style.overflow=previousOverflow;trigger?.focus();});
desktop.addEventListener('change',()=>{groups.forEach(group=>setOpen(group,false,true));if(desktop.matches)closeMenu();});
reducedMotion.addEventListener('change',()=>{backdropAnimation?.cancel();backdropAnimation=undefined;backdropClosing=false;groups.forEach(group=>setOpen(group,group.hasAttribute('data-open'),true));});
