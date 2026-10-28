import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',fullyParallel:false,workers:1,retries:0,reporter:[['list'],['html',{open:'never'}]],use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',viewport:{width:1440,height:1000},trace:'retain-on-failure'},webServer:{command:'node server.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:false}});
