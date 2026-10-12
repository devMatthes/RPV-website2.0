// Deployment helper: consumes a documented, short-lived asset upload session on stdin.
// This is not an account API token. Never print it or persist it in the repository.
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {accountId,jwt,buckets,manifest}=JSON.parse(input);
if(!/^[a-f0-9]{32}$/.test(accountId)||!jwt)throw new Error('Invalid upload session');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'};
let completion=jwt;
for(const bucket of buckets){
 const form=new FormData();
 for(const hash of bucket){const entry=Object.entries(manifest).find(([,file])=>file.hash===hash);if(!entry)throw new Error('Unknown asset hash');const [path]=entry;const bytes=await readFile(join('.panel-assets',path));form.append(hash,new Blob([bytes.toString('base64')],{type:types[extname(path)]??'application/octet-stream'}),hash);}
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/assets/upload?base64=true`,{method:'POST',headers:{Authorization:`Bearer ${jwt}`},body:form,signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok||!result.success)throw new Error(`Asset upload failed (HTTP ${response.status})`);
 if(result.result?.jwt)completion=result.result.jwt;
}
process.stdout.write(JSON.stringify({jwt:completion,files:Object.keys(manifest).length}));
