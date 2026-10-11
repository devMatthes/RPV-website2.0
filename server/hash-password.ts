import { hashPassword } from './security.ts';
import { createInterface } from 'node:readline';
// Supply via stdin instead of arguments or shell history. Disable terminal echo when using a terminal.
const reader=createInterface({input:process.stdin,output:process.stdout,terminal:false});
reader.once('line',async password=>{console.log(await hashPassword(password));reader.close();});
