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
function fadeBackdrop(open:boolean,previousOpacity?:string) {
  if(!scrim)return;
  const from=previousOpacity??(backdropAnimation?getComputedStyle(scrim).opacity:open?'0':'1');
  backdropAnimation?.cancel();
  backdropClosing=!open;
  const animation=scrim.animate([{opacity:from},{opacity:open?1:0}],{duration:open?280:200,easing:'cubic-bezier(.4,0,.6,1)',fill:'both'});
  backdropAnimation=animation;
  void animation.finished.then(()=>{if(backdropAnimation===animation&&open){animation.cancel();backdropAnimation=undefined;}}).catch(()=>{/* Reversed or dismissed. */});
  return animation;
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
  const backdropFrom=backdropAnimation&&scrim?getComputedStyle(scrim).opacity:undefined;
  const running=animations.get(group);
  if(wasOpen===open&&!immediate)return;
  const panel=group.querySelector<HTMLElement>('.mega-panel');
  const animate=panel&&desktop.matches&&!reducedMotion.matches&&!immediate;
  // Read the current frame before cancelling so a quick reversal stays continuous.
  const currentHeight=panel&&running?panel.getBoundingClientRect().height:undefined;
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
  group.toggleAttribute('data-animating',!!animate);
  if(!animate)return;
  const fullHeight=panel.getBoundingClientRect().height;
  if(open&&(!backdropWasOpen||backdropClosing))fadeBackdrop(true,backdropFrom);
  // Animate the opaque surface's height; only its text and the backdrop fade.
  const active:Animation[]=switching?[]:[panel.animate([
    {height:`${currentHeight??(open?0:fullHeight)}px`},
    {height:`${open?fullHeight:0}px`},
  ],{duration:open?240:200,easing:'cubic-bezier(.4,0,.6,1)',fill:'both'})];
  if(!open){const fade=fadeBackdrop(false,backdropFrom);if(fade)active.push(fade);}
  const lastRow=Math.max(...rows.map(({row})=>row));
  rows.forEach(({element,row},index)=>{
    const hidden={opacity:0,transform:switching?'translateY(0)':'translateY(-4px)'};
    const visible={opacity:1,transform:'translateY(0)'};
    active.push(element.animate([running?rowFrames[index]:open?hidden:visible,open?visible:hidden],{duration:switching?120:open?220:100,delay:switching?0:open?40+row*18:(lastRow-row)*8,easing:'cubic-bezier(.4,0,.6,1)',fill:'both'}));
  });
  animations.set(group,active);
  void Promise.all(active.map(animation=>animation.finished)).then(()=>{
    if(animations.get(group)!==active)return;
    animations.delete(group);
    group.removeAttribute('data-closing');
    group.removeAttribute('data-animating');
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
  group.addEventListener('pointerleave',()=>{if(desktop.matches&&!group.contains(document.activeElement))leaveTimers.set(group,setTimeout(()=>setOpen(group,false),80));});
  link.addEventListener('focus',()=>{if(desktop.matches)open();});
  group.addEventListener('focusout',event=>{
    // During native pointer focus changes activeElement can briefly be body.
    // relatedTarget keeps the submenu open when moving from its button to a link.
    if(!(event.relatedTarget instanceof Node)||!group.contains(event.relatedTarget))setOpen(group,false);
  });
  group.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&group.hasAttribute('data-open')){event.preventDefault();event.stopPropagation();(desktop.matches?link:button).focus({preventScroll:true});setOpen(group,false);}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&(event.target===button||event.target===link)){
      event.preventDefault();open();(event.key==='ArrowDown'?links[0]:links.at(-1))?.focus({preventScroll:true});
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
