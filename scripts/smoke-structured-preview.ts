import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer,loadConfigFromFile} from 'vite';
import react from '@vitejs/plugin-react';
import {optionalWebAssets} from '../apps/workbench-web/optional-web-assets';
import {writeFile} from 'node:fs/promises';
const output=await mkdtemp(join(tmpdir(),'opencraft-files-entry-'));
const fixtures=Object.fromEntries(await Promise.all(['csv','tsv','xls','xlsm','drawio','dio','excalidraw','mmd','mermaid'].map(async ext=>[ext,(await readFile('tests/fixtures/structured/sample.'+ext)).toString('base64')])));
const runtime=`
const reads=[];window.fixtureReads=reads;const fixtures=${JSON.stringify(fixtures)};
const runtime={resources:{host:{canRequest:method=>method==='fuzzyFileSearch/sessionStart'},fileSystem:{
async getMetadata(path){return {isFile:path!=='/fixture',isDirectory:path==='/fixture',modifiedAtMs:0,size:100}},
async readFile(path){reads.push(path);return {dataBase64:path.includes('broken')?btoa('invalid document'):fixtures[path.split('.').at(-1)]??btoa('invalid document')}},
async readDirectory(path){return {entries:path==='/fixture'? [{fileName:'nested',isDirectory:true,isFile:false},...['csv','tsv','xls','xlsm','drawio','dio','excalidraw','mmd','mermaid'].map(ext=>({fileName:'sample.'+ext,isDirectory:false,isFile:true}))]:[{fileName:'child.html',isDirectory:false,isFile:true}]}},
async createFuzzyFileSearchSession(options){return {update:async()=>{options.onUpdated({files:[{root:'/fixture',path:'report-0.html',file_name:'report-0.html',match_type:'file'}]});options.onCompleted()},stop:async()=>{}}}
}}};
export const useAppServerRuntime=()=>runtime;
export const useBlobResources=()=>window.fixtureBlobs;
export const useAppServerSnapshot=()=>({hostId:'tree-fixture',conversation:{execution:{cwd:'/fixture',runtimeWorkspaceRoots:['/fixture']}}});`;
const source=`
import '/apps/workbench-web/src/runtime/web-crypto-compat.ts';
import {FilePreviewProvider} from '@opencraft/file-preview-web';
import React,{useSyncExternalStore,useState} from 'react';import {Context} from '@deepseek-ai/cordis';import {BlobResourceService} from '@opencraft/blob-resources';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createIntlTestRoot} from '/tests/fixtures/intl-root.tsx';
import {useUiPreferencesRuntime} from '/apps/workbench-web/src/runtime/ui-preferences-runtime.tsx';
import {createWorkbenchPanelReactRuntime} from '@opencraft/workbench-panels-react';
import {BuiltinWorkbenchPanelPlugin} from '/apps/workbench-web/src/panels/builtin-panel-plugin.tsx';
import {AppShell} from '/apps/workbench-web/src/components/app-shell.tsx';
import {RightPanel} from '/apps/workbench-web/src/components/right-panel.tsx';
import {initializeAppearanceTheme,setThemePreference} from '/apps/workbench-web/src/appearance-theme.ts';
import '/apps/workbench-web/src/styles/app.scss';
initializeAppearanceTheme();
const context=new Context();await context.plugin(BlobResourceService);window.fixtureBlobs=context.blobResources;
const runtime=await createWorkbenchPanelReactRuntime({defaultRightPanelOpen:true});await runtime.install(BuiltinWorkbenchPanelPlugin);
const panels=runtime.panels;panels.ensureOwner('scope');panels.dispatch('scope',{type:'set-region-open',region:'right',open:true,allowEmpty:true});if(innerWidth<700)panels.dispatch('scope',{type:'toggle-right-full-width'});const get=()=>panels.getOwnerSnapshot('scope'),subscribe=f=>panels.subscribeOwner('scope',f);
function App(){const state=useSyncExternalStore(subscribe,get);const[cwd,setCwd]=useState('/fixture');const preferences=useUiPreferencesRuntime();
window.fixture={panels,state,setCwd,setThemePreference,previews:runtime.context.filePreviews,setLocale:locale=>preferences.set('locale.override',locale)};
const panel=<RightPanel hostPresentationActive={innerWidth<700?true:undefined} state={state} presentationId='view' renderers={runtime.renderers.getSnapshot()} toolbarActions={panels.getToolbarActionSnapshot()} toolbarActionContext={{ownerId:'scope',resourceOwnerId:'scope',hostId:'tree-fixture',cwd}} onAction={a=>panels.dispatch('scope',a)} onCloseTab={t=>panels.close('scope',t.region,t.id)}/>;
return <AppShell layoutScope='scope' header={<span>Workspace</span>} floatingSidebarHeader={()=>null} leftPanel={null} sidebarOpen={false} sidebarWidth={260} onSidebarCollapse={()=>{}} onSidebarExpand={()=>{}} onSidebarResizeEnd={()=>{}} windowChrome={{kind:'browser',platform:'linux',safeArea:{left:0,right:0}}} rightPanel={innerWidth<700?null:panel} rightPanelOpen={state.right.open} rightPanelFullWidth={state.rightPanelFullWidth} onRightPanelOpenChange={open=>panels.dispatch('scope',{type:'set-region-open',region:'right',open,allowEmpty:true})}>{innerWidth<700?panel:<p>Conversation</p>}</AppShell>
}
createIntlTestRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><FilePreviewProvider service={runtime.context.filePreviews}><App/></FilePreviewProvider></QueryClientProvider>);`;
// Reuse production dependency ownership, without crawling generated Expo HTML.
const workbenchConfig=await loadConfigFromFile({command:'serve',mode:'development'},resolve('apps/workbench-web/vite.config.ts'));
if(!workbenchConfig)throw new Error('Workbench Vite configuration unavailable');
const vite=await createServer({configFile:false,root:process.cwd(),cacheDir:join(output,'vite-cache'),logLevel:'error',resolve:{dedupe:['react','react-dom','react-intl']},esbuild:{jsx:'automatic'},optimizeDeps:{...workbenchConfig.config.optimizeDeps,entries:['/tree-fixture.tsx'],include:[...workbenchConfig.config.optimizeDeps?.include??[],'@extend-ai/react-xlsx','docx-preview','@aiden0z/pptx-renderer/browser','@excalidraw/excalidraw','dompurify','@tanstack/react-virtual']},server:{host:'127.0.0.1',port:0,hmr:false},plugins:[react(),optionalWebAssets(),{name:'file-tree-fixture',enforce:'pre',resolveId(id,importer){if(id.endsWith('/appserver-runtime-context')&&importer?.includes('/panels/'))return '/tree-runtime.ts';return ['/tree-runtime.ts','/tree-fixture.tsx'].includes(id)?id:null},load:id=>id==='/tree-runtime.ts'?runtime:id==='/tree-fixture.tsx'?source:null,configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/')return next();res.setHeader('content-type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tree-fixture.tsx"></script>')})}}]});
let browser:any;
try{
await vite.listen();const {chromium}=await import(process.env.OPENCRAFT_PLAYWRIGHT_MODULE??'playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const evidence=[];
for(const width of [390,1280])for(const theme of ['light','dark']){
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<700});const errors:string[]=[];const externalRequests:string[]=[];page.on('request',request=>{const url=new URL(request.url());if(url.protocol.startsWith('http')&&url.hostname!=='127.0.0.1')externalRequests.push(url.origin)});page.on('pageerror',(e:Error)=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('browser:',m.text())});await page.addInitScript('window.__name=value=>value');
 await page.goto('http://127.0.0.1:'+(vite.httpServer!.address() as any).port);await page.waitForFunction(()=>Boolean((window as any).fixture));await page.evaluate(theme=>(window as any).fixture.setThemePreference(theme),theme);
 const open=async(path:string)=>page.evaluate(path=>(window as any).fixture.panels.open('scope','resource',{resource:path,preview:false}),path);
 const waitReady=async()=>{
   await page.locator('[data-file-preview-phase]:not([data-file-preview-phase="opening"])').waitFor({state:'attached',timeout:90000});
   if(await page.locator('[data-file-preview-phase]').getAttribute('data-file-preview-phase')!=='ready') console.log('ENGINE_FAILURE',await page.evaluate(()=>[...(window as any).fixture.previews.pool.entries.values()].map((entry:any)=>({phase:entry.snapshot.phase,error:entry.snapshot.error?.stack}))));
   assert.equal(await page.locator('[data-file-preview-phase]').getAttribute('data-file-preview-phase'),'ready',await page.locator('body').innerText());
 };
 const formats=[];
 for(const ext of (process.env.OPENCRAFT_PREVIEW_FORMATS?.split(',')??['csv','tsv','xls','xlsm','drawio','dio','excalidraw','mmd','mermaid'])){
  await open('/fixture/sample.'+ext);await waitReady();
  if(ext==='csv'||ext==='tsv'){
   await page.getByRole('table',{name:'sample.'+ext,exact:true}).waitFor();
   await page.getByRole('cell',{name:ext==='csv'?'中文,数据':'中文',exact:true}).waitFor();
   if(ext==='csv'){
    await page.getByRole('cell',{name:'00125',exact:true}).waitFor();
    await page.getByRole('button',{name:'Source',exact:true}).click();
    assert.match(await page.locator('.structured-preview__source').innerText(),/Line one\nLine two/);
    const sourceNode=await page.locator('.structured-preview__source').elementHandle();
    await page.getByRole('button',{name:'Source',exact:true}).focus();
    await page.evaluate(()=>{const table=document.querySelector('.structured-preview--table');(window as any).localizedTable=table;(window as any).localeFocus=document.activeElement});
    for(const [locale,sourceLabel,tableLabel] of [['zh-CN','源文本','表格'],['ms-MY','Sumber','Jadual'],['th-TH','ต้นฉบับ','ตาราง'],['en-US','Source','Table']]){
      await page.evaluate(locale=>(window as any).fixture.setLocale(locale),locale);
      await page.getByRole('button',{name:sourceLabel,exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:sourceLabel,exact:true}).getAttribute('aria-pressed'),'true');
      await page.getByRole('button',{name:tableLabel,exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>document.querySelector('.structured-preview--table')===(window as any).localizedTable),true);
      assert.equal(await page.evaluate(()=>document.activeElement===(window as any).localeFocus),true);
      assert.equal(await sourceNode!.evaluate(node=>node===document.querySelector('.structured-preview__source')),true);
      if(locale==='zh-CN')await page.screenshot({path:join(output,'csv-zh-CN-'+theme+'-'+width+'.png')});
    }
    await page.getByRole('button',{name:'Table',exact:true}).click();
   }
  }else if(ext==='xls'||ext==='xlsm'){
   await page.getByRole('tab',{name:'Summary',exact:true}).waitFor();
   await page.getByRole('tab',{name:'Details',exact:true}).click();
   assert.equal(await page.getByRole('tab',{name:'Details',exact:true}).getAttribute('aria-selected'),'true');
   assert.equal(await page.locator('.office-preview--xlsx [contenteditable="true"]').count(),0);
  }else if(ext==='drawio'||ext==='dio'){
   await page.locator('[data-diagram-ready="true"]').waitFor({timeout:60000});
   const iframe=page.frameLocator('.structured-preview__drawio');
   await iframe.getByText('Draw.io first page',{exact:true}).waitFor();
   assert.ok(await iframe.locator('svg').count()>0);
   await page.screenshot({path:join(output,ext+'-'+theme+'-'+width+'.png')});
  }else{
   await page.locator('[data-diagram-ready="true"] svg').waitFor();
   assert.ok(await page.locator('[data-diagram-ready] svg').evaluate(svg=>(svg as SVGSVGElement).viewBox.baseVal.width>0));
   const transform=await page.locator('.structured-preview__diagram-content').getAttribute('style');
   await page.getByRole('button',{name:'Zoom in',exact:true}).click();
   assert.notEqual(await page.locator('.structured-preview__diagram-content').getAttribute('style'),transform);
   if(width<700){
    const box=await page.locator('.structured-preview__diagram').boundingBox();assert.ok(box);
    const cdp=await page.context().newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
    const before=await page.locator('.structured-preview__diagram-content').getAttribute('style');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y,id:1},{x:x+25,y,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-55,y:y+10,id:1},{x:x+55,y:y+10,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.notEqual(await page.locator('.structured-preview__diagram-content').getAttribute('style'),before,'native touch pinch pans and zooms');
    await cdp.detach();await page.getByRole('button',{name:'Fit diagram',exact:true}).tap();
   }else await page.getByRole('button',{name:'Fit diagram',exact:true}).click();
  }
  assert.equal(await page.getByRole('button',{name:'Show file tree',exact:true}).getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'preview must not widen page');
  await page.screenshot({path:join(output,ext+'-'+theme+'-'+width+'.png')});formats.push(ext);
  if(ext==='csv')await page.evaluate(()=>{(window as any).retainedTable=document.querySelector('.structured-preview--table')});
  if(ext==='tsv'){
   await open('/fixture/sample.csv');await waitReady();
   assert.equal(await page.evaluate(()=>document.querySelector('.structured-preview--table')===(window as any).retainedTable),true);
  }
 }
 await open('/fixture/broken.mmd');await page.locator('[data-file-preview-phase="failed"]').waitFor({timeout:60000});
 await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
 await page.evaluate(()=>{const f=(window as any).fixture;for(const t of f.state.right.tabs)f.panels.close('scope','right',t.id)});
 assert.equal(await page.evaluate(()=>(window as any).fixture.previews.pool.size),0,'closed tabs must release retained engines');
 assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[],'previews must not request external resources');evidence.push({width,theme,formats});await page.close();
}
await writeFile(join(output,'result.json'),JSON.stringify({passed:true,evidence,output},null,2));console.log(JSON.stringify({passed:true,evidence,output}));
}finally{await browser?.close();await vite.close();}
