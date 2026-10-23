import type { WebPreviewDocument } from "@opencraft/file-preview-web";
import viewerUrl from "../vendor/drawio/viewer-static.min.js?url";
import { normalizeDrawio } from "./drawio-model";
import "./preview.web.scss";

export function openDrawio(source: string, name: string, signal: AbortSignal): WebPreviewDocument {
  const xml = normalizeDrawio(source);
  signal.throwIfAborted();
  const element = document.createElement("div"); element.className = "structured-preview";
  const frame = document.createElement("iframe"); frame.className = "structured-preview__drawio";
  frame.title = name; frame.sandbox.add("allow-scripts"); frame.referrerPolicy = "no-referrer";
  const token = crypto.randomUUID(); let disposed = false, failure: unknown;
  const listeners = new Set<(error: unknown) => void>();
  const scriptUrl = new URL(viewerUrl, location.href).href;
  const payload = JSON.stringify({ xml, token }).replace(/</gu, "\\u003c");
  const script = `const input=${payload};
const send=(type)=>parent.postMessage({token:input.token,type},'*');
const diagram=document.getElementById('diagram');let viewer;
function start(){try{
mxCodec.allowEval=false;Editor.initMath=()=>{};
const config={xml:input.xml,toolbar:'pages zoom layers','toolbar-nohide':true,'toolbar-position':'top',lightbox:false,editable:false,nav:true,resize:false,'check-visible-state':false,'auto-fit':true};
diagram.setAttribute('data-mxgraph',JSON.stringify(config));
GraphViewer.createViewerForElement(diagram,v=>{viewer=v;v.graph.setEnabled(false);v.graph.openLink=()=>null;v.graph.getLinkForCell=()=>null;v.graph.maxFitScale=1;v.graph.fit(16);send('ready')});
}catch(error){document.getElementById('status').textContent='Unable to display diagram';send('failed')}}
addEventListener('message',event=>{if(event.source!==parent||event.data?.token!==input.token)return;
if(event.data.type==='theme')document.documentElement.style.colorScheme=event.data.dark?'dark':'light';
if(event.data.type==='active'&&event.data.active)dispatchEvent(new Event('resize'))});
document.addEventListener('click',event=>{if(event.target.closest?.('a')){event.preventDefault();event.stopImmediatePropagation()}},true);
addEventListener('error',()=>send('failed'));
window.MathJax={typeset:()=>{},typesetClear:()=>{}};window.mxLoadResources=false;window.mxLoadStylesheets=false;window.DRAWIO_BASE_URL='';window.PROXY_URL='';
const loader=document.createElement('script');loader.src=${JSON.stringify(scriptUrl)};loader.onload=start;loader.onerror=()=>send('failed');document.head.append(loader);`;
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${location.origin}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><style>html,body{height:100%;margin:0;font:14px system-ui;background:light-dark(#fff,#121212);color:light-dark(#111,#eee)}#diagram{width:100%;height:100%;overflow:auto}#status{position:absolute;inset:48px 0 auto;text-align:center;pointer-events:none}.geToolbarContainer{position:sticky!important;top:0!important}</style></head><body><div id="status" role="status"></div><div id="diagram"></div><script>${script}</script></body></html>`;
  const message = (event: MessageEvent) => {
    if (disposed || event.source !== frame.contentWindow || event.data?.token !== token) return;
    if (event.data.type === "ready") { element.dataset.diagramReady = "true"; frame.contentWindow?.postMessage({ token, type: "theme", dark: darkTheme }, "*"); }
    if (event.data.type === "failed" && !failure) { failure = new Error("Draw.io could not display the document"); for (const listener of listeners) listener(failure); }
  };
  window.addEventListener("message", message); element.append(frame);
  let darkTheme = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true; signal.removeEventListener("abort", dispose); window.removeEventListener("message", message); listeners.clear(); frame.remove(); element.remove();
  };
  signal.addEventListener("abort", dispose, { once: true });
  return { element, dispose,
    setActive(active) { element.inert = !active; frame.contentWindow?.postMessage({ token, type: "active", active }, "*"); },
    setTheme(dark) { darkTheme = dark; frame.contentWindow?.postMessage({ token, type: "theme", dark }, "*"); },
    subscribeFailure(listener) { if (failure) listener(failure); else listeners.add(listener); return () => listeners.delete(listener); },
  };
}
