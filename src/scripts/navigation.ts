const desktop=matchMedia('(min-width:1100px)');
const hover=matchMedia('(hover:hover) and (pointer:fine)');
const groups=[...document.querySelectorAll<HTMLElement>('[data-has-submenu]')];
const header=document.querySelector<HTMLElement>('.header');
const scrim=document.querySelector<HTMLElement>('[data-nav-scrim]');
function syncBackdrop() {
  const open=desktop.matches&&groups.some(group=>group.hasAttribute('data-open')&&group.closest('.navigation--desktop'));
  if(open&&header)header.style.setProperty('--nav-bottom',`${Math.max(0,header.getBoundingClientRect().bottom)}px`);
  header?.toggleAttribute('data-mega-open',open);
  if(scrim)scrim.hidden=!open;
}
function setOpen(group:HTMLElement,open:boolean) {
  group.toggleAttribute('data-open',open);
  group.querySelector<HTMLButtonElement>('.nav-toggle')?.setAttribute('aria-expanded',String(open));
  syncBackdrop();
}
const closeAll=()=>groups.forEach(group=>setOpen(group,false));
document.querySelectorAll<HTMLElement>('[data-dropdown-nav]').forEach(nav=>{nav.dataset.enhanced='true';});
groups.forEach(group=>{
  const button=group.querySelector<HTMLButtonElement>('.nav-toggle')!;
  const link=group.querySelector<HTMLAnchorElement>('.nav-link')!;
  const links=[...group.querySelectorAll<HTMLAnchorElement>('.nav-submenu a')];
  const open=()=>{groups.filter(other=>other!==group).forEach(other=>setOpen(other,false));setOpen(group,true);};
  button.hidden=false;
  button.addEventListener('click',()=>{if(group.hasAttribute('data-open'))setOpen(group,false);else open();});
  group.addEventListener('pointerenter',()=>{if(desktop.matches&&hover.matches)open();});
  group.addEventListener('pointerleave',()=>{if(desktop.matches&&!group.contains(document.activeElement))setOpen(group,false);});
  link.addEventListener('focus',()=>{if(desktop.matches)open();});
  group.addEventListener('focusout',event=>{
    // During native pointer focus changes activeElement can briefly be body.
    // relatedTarget keeps the submenu open when moving from its button to a link.
    if(!(event.relatedTarget instanceof Node)||!group.contains(event.relatedTarget))setOpen(group,false);
  });
  group.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&group.hasAttribute('data-open')){event.preventDefault();event.stopPropagation();button.focus();setOpen(group,false);}
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
desktop.addEventListener('change',()=>{closeAll();if(desktop.matches)closeMenu();});
