import type {ProjectDraft} from './cms-project.ts';
export interface PublicationManifest {
 schema:1;id:string|null;projectMode:'baseline'|'cms';
 texts:{slug:string;versionId:string;data:Record<string,string>}[];
 projects:{versionId:string;data:ProjectDraft}[];
 assets:{id:string;sha256:string;bytes:number;mime:string}[];
}
export interface PublishedImage {id:string;alt:string;src:string;srcset:string;width:number;height:number;}
export interface BuiltPublication {schema:1;id:string|null;projectMode:'baseline'|'cms';texts:Record<string,Record<string,string>>;projects:(ProjectDraft&{gallery:PublishedImage[]})[];}
