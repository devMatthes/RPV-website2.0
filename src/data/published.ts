import {readFileSync} from 'node:fs';import type {BuiltPublication} from '../lib/publication-types';import {textPage,textDefaults,validateTexts} from '../lib/cms-texts';import {validateProject} from '../lib/cms-project';
let publication:BuiltPublication|undefined;
if(process.env.CMS_PUBLICATION_FILE&&process.env.PANEL_BUILD!=='true'){
 const raw=JSON.parse(readFileSync(process.env.CMS_PUBLICATION_FILE,'utf8')) as BuiltPublication;if(raw.schema!==1||!['baseline','cms'].includes(raw.projectMode)||!Array.isArray(raw.projects)||raw.projects.length>500)throw new Error('Invalid CMS publication');
 for(const [slug,value] of Object.entries(raw.texts)){const page=textPage(slug);if(!page)throw new Error('Unknown published text group');validateTexts(page,value);}for(const project of raw.projects){validateProject(Object.fromEntries(Object.entries(project).filter(([key])=>key!=='gallery')));if(project.archived||!Array.isArray(project.gallery)||project.gallery.length!==project.images.length)throw new Error('Invalid published gallery');for(const image of project.gallery){if(!/^cms\/[a-f0-9]{64}-\d+\.webp$/.test(image.src)||image.srcset.split(', ').some(part=>!/^cms\/[a-f0-9]{64}-\d+\.webp \d+w$/.test(part)))throw new Error('Invalid public media path');}}if(new Set(raw.projects.map(p=>p.slug)).size!==raw.projects.length)throw new Error('Duplicate project URL');publication=raw;
}
export function publishedTexts(slug:string):Record<string,string>{const page=textPage(slug);if(!page)throw new Error('Unknown text group');return publication?.texts[slug]??textDefaults(page);}
export const publishedProjects=publication?.projectMode==='cms'?publication.projects:undefined;
export const publicationId=publication?.id??null;
export const publicContact=publishedTexts('shared');
export const publicPhoneHref='tel:'+publicContact.phone.replace(/[\s()-]/g,'');
