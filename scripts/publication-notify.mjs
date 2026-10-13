const id=process.env.PUBLICATION_ID??'';if(!id)process.exit(0);if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid publication');
const endpoint=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);endpoint.searchParams.set('audience','rpv-publication');const identity=await fetch(endpoint,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(10000)});if(!identity.ok)throw new Error('OIDC unavailable');const {value}=await identity.json();process.stdout.write(`::add-mask::${value}\n`);
const state=process.env.PUBLICATION_RESULT==='success'?'complete':'fail';
let finished=false,lastStatus=0;
for(let attempt=0;attempt<3;attempt++){
 try{const response=await fetch(`${process.env.PUBLICATION_API_URL}/api/publishing/jobs/${id}/${state}`,{method:'POST',headers:{Authorization:`Bearer ${value}`},signal:AbortSignal.timeout(15000)});lastStatus=response.status;if(response.ok){finished=true;break;}if(response.status<500&&response.status!==429)break;}catch{}
 if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));
}
if(!finished)throw new Error(`Publication acknowledgement failed: ${lastStatus}; rerun the failed deployment job to acknowledge the same snapshot.`);console.log(`Publication ${state} acknowledged.`);
