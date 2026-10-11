import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const derive=(password:string,salt:string):Promise<Buffer>=>new Promise((resolve,reject)=>scrypt(password,salt,64,(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string) { if(password.length<12||password.length>200)throw new Error('Hasło musi mieć 12–200 znaków.');const salt=randomBytes(16).toString('hex');return `${salt}:${(await derive(password,salt)).toString('hex')}`; }
export async function checkPassword(password:unknown,hash:string) { if(typeof password!=='string'||password.length>200)return false;const [salt,key]=hash.split(':');if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(key))return false;return timingSafeEqual(await derive(password,salt),Buffer.from(key,'hex')); }
