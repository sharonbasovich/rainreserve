import {defineConfig} from '@playwright/test';
const prefix=process.env.STATIC_PREFIX||'/';
const baseURL=process.env.BASE_URL||`http://127.0.0.1:4173${prefix}`;
if(!baseURL.endsWith('/'))throw new Error('BASE_URL and STATIC_PREFIX must end with /');
export default defineConfig({
 testDir:'./tests',fullyParallel:false,workers:1,retries:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL,browserName:'chromium',viewport:{width:1440,height:1000},trace:'retain-on-failure'},
 // An explicit BASE_URL runs the same suite against the public host, without a local server.
 webServer:process.env.BASE_URL?undefined:{command:'node server.mjs',url:baseURL,reuseExistingServer:false},
});
