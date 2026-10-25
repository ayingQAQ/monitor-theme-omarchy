import {defineConfig} from 'vite';
export default defineConfig(async({mode})=>({plugins:mode==='demo'?[(await import('./dev/hub.js')).demoHub()]:[],server:{proxy:mode==='demo'?undefined:{'/api':{target:process.env.MONITOR_HUB||'http://127.0.0.1:9911',changeOrigin:true,ws:true}}},build:{target:'es2022'}}));
