import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be 1024–65535');
const files=new Map([['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],['/app.mjs','app.mjs'],['/model.mjs','model.mjs']]);
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8'};
createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;const file=files.get(path);if(!file||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}try{const body=await readFile(new URL(`./dist/${file}`,import.meta.url));res.writeHead(200,{'Content-Type':mime[file.split('.').pop()],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(500);res.end('Build the app first with npm run build');}}).listen(port,'127.0.0.1',()=>console.log(`RainReserve: http://127.0.0.1:${port}/`));
