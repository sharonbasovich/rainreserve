import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for (const f of ['index.html','styles.css','app.mjs','model.mjs','rainfall.mjs']) await copyFile(f,`dist/${f}`);
