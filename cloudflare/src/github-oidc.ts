import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
import type {WorkerEnv} from './config.ts';import {HttpError} from './http.ts';
const keys=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'),{timeoutDuration:5000,cacheMaxAge:600000});
export async function githubIdentity(request:Request,env:WorkerEnv,testKeys?:JWTVerifyGetKey){
 if(env.ENVIRONMENT!=='local'&&new URL(request.url).origin!==env.ADMIN_ORIGIN)throw new HttpError(401,'Niedozwolony adres publikacji.');
 const header=request.headers.get('Authorization'),token=header?.startsWith('Bearer ')?header.slice(7):null;if(!token||token.length>16384)throw new HttpError(401,'Brak tożsamości buildu.');
 try{const {payload}=await jwtVerify(token,testKeys??keys,{issuer:'https://token.actions.githubusercontent.com',audience:'rpv-publication',algorithms:['RS256'],requiredClaims:['iat','exp','sub','repository','repository_id','repository_owner_id','ref','workflow_ref','run_id','run_attempt','event_name'],maxTokenAge:'10m'});
  if(payload.repository!=='devMatthes/RPV-website2.0'||payload.repository_id!=='1413260902'||payload.repository_owner_id!=='45334318'||payload.ref!=='refs/heads/main'||payload.workflow_ref!=='devMatthes/RPV-website2.0/.github/workflows/pages.yml@refs/heads/main'||!['push','workflow_dispatch'].includes(String(payload.event_name))||!/^\d+$/.test(String(payload.run_id))||!/^\d+$/.test(String(payload.run_attempt)))throw new Error('Untrusted workflow');
  return {runId:String(payload.run_id),attempt:String(payload.run_attempt),event:String(payload.event_name)};
 }catch{throw new HttpError(401,'Nieprawidłowa tożsamość buildu.');}
}
