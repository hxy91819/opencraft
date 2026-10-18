import { useEffect, useRef, useState, type RefObject, type PointerEvent } from "react";
import { RotateCcw, X } from "lucide-react";
import { computeBrowserViewportLayout, type BrowserViewportMode } from "@opencraft/browser-core";
import { DEVICE_PRESETS, viewportDimension, computeDragResizeDimensions } from "./browser-viewport-controls";

type DeviceMode = Exclude<BrowserViewportMode, {type:"responsive"}>;
interface ToolbarProps {
  readonly mode: DeviceMode;
  readonly zoom: number;
  onChange(mode: DeviceMode): void;
  onClose(): void;
  onZoom?(percent: number): void;
}

export function BrowserDeviceToolbar(props: ToolbarProps) {
  const { mode, zoom, onChange, onClose, onZoom } = props;
  const selected = mode.type === "device" && DEVICE_PRESETS.find(preset => preset.id === mode.presetId);
  const choose = (id: string) => {
    const preset = DEVICE_PRESETS.find(candidate => candidate.id === id);
    if (!preset) return;
    const size = id === "responsive" ? mode : preset;
    onChange({ type: "device", presetId: id, width: size.width, height: size.height });
    onZoom?.(100);
  };
  const edit = (axis: "width" | "height", value: number) =>
    onChange({ ...mode, type: "device", presetId: "responsive", [axis]: value });
  const zoomLevels = Array.from(new Set([zoom, 50, 75, 100, 125, 150, 200])).sort((a, b) => a - b);
  return <div role="toolbar" aria-label="Device toolbar" className="browser-device-toolbar">
    <label htmlFor="browser-device-preset" className="browser-device-toolbar__label">Dimensions:</label>
    <select aria-label="Device preset" id="browser-device-preset" value={selected ? selected.id : "responsive"}
      onChange={event => { choose(event.currentTarget.value); event.currentTarget.blur(); }}>
      {DEVICE_PRESETS.map(({ id, label }) => <option value={id} key={id}>{label}</option>)}
    </select>
    <div className="browser-device-toolbar__dimensions">
      {(["width", "height"] as const).map((axis, index) => <span key={axis} style={{ display: "contents" }}>
        {index > 0 && <span aria-hidden="true">×</span>}
        <ViewportField axis={axis} value={mode[axis]} commit={value => edit(axis, value)} />
      </span>)}
    </div>
    <button aria-label="Rotate viewport" title="Rotate viewport" type="button"
      onClick={() => onChange({ ...mode, width: mode.height, height: mode.width })}><RotateCcw size={16} /></button>
    {onZoom && <select aria-label="Browser zoom" className="browser-device-toolbar__zoom" value={zoom}
      onChange={event => { onZoom(Number(event.currentTarget.value)); event.currentTarget.blur(); }}>
      {zoomLevels.map(percent => <option key={percent} value={percent}>{percent}%</option>)}
    </select>}
    <button type="button" aria-label="Close device toolbar" title="Close device toolbar"
      className="browser-device-toolbar__close" onClick={onClose}><X size={14} /></button>
  </div>;
}

function ViewportField({ axis, value, commit }: {
  readonly axis: "width" | "height";
  readonly value: number;
  commit(value: number): void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const cancelled = useRef(false);
  const minimum = axis === "width" ? 240 : 160;
  const publish = (text: string, finish: boolean) => {
    if (!text.trim()) return;
    const number = Number(text);
    if (!Number.isFinite(number)) return;
    if (finish || number >= minimum && number <= 4096) commit(viewportDimension(number, axis));
  };
  return <input type="number" aria-label={`Viewport ${axis}`} className="browser-device-toolbar__input"
    min={minimum} max={4096} value={editing ?? value}
    onFocus={() => { cancelled.current = false; setEditing(String(value)); }}
    onChange={event => { const text = event.currentTarget.value; setEditing(text); publish(text, false); }}
    onBlur={event => { if (!cancelled.current) publish(event.currentTarget.value, true); setEditing(null); }}
    onKeyDown={event => {
      if (event.key !== "Escape" && event.key !== "Enter") return;
      event.preventDefault();
      cancelled.current = event.key === "Escape";
      event.currentTarget.blur();
    }} />;
}
type Edge="left"|"right"|"bottom"|"bottom-left"|"bottom-right";
export function BrowserDeviceHandles({mode,slot,onChange}:{mode:DeviceMode;slot:RefObject<HTMLDivElement|null>;onChange(mode:DeviceMode):void}) {
  const [size,setSize]=useState({width:0,height:0});
  const drag=useRef<{pointerId:number;edge:Edge;mode:DeviceMode;x:number;y:number;scale:number}|null>(null);
  // Parent slot refs attach after child layout effects on a fresh panel mount.
  // Subscribe after attachment; do not render hit targets until measured.
  useEffect(()=>{
    if(!slot.current)return;
    const measure=()=>{const r=slot.current!.getBoundingClientRect();setSize({width:r.width,height:r.height});};
    const observer=new ResizeObserver(measure);observer.observe(slot.current);measure();return()=>observer.disconnect();
  },[slot]);
  const layout=computeBrowserViewportLayout({x:0,y:0,...size},mode);
  const bounds=layout.visualBounds;
  const finish=(event:PointerEvent<HTMLButtonElement>,cancel:boolean)=>{
    const current=drag.current;
    if(!current||current.pointerId!==event.pointerId)return;
    drag.current=null;
    if(cancel)onChange(current.mode);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  if(size.width<=0||size.height<=0)return null;
  return <div className="browser-device-handles" style={{left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height}}>
    {(["left","right","bottom","bottom-left","bottom-right"] as const).map(edge=><button key={edge} type="button"
      className={`browser-device-resize browser-device-resize--${edge}`} aria-label={`Resize viewport ${edge}`} title={`Resize viewport ${edge}`}
      onPointerDown={event=>{
        if(event.button!==0||layout.scale<=0)return;
        event.preventDefault();drag.current={pointerId:event.pointerId,edge,mode,x:event.clientX,y:event.clientY,scale:layout.scale};
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event=>{
        const d=drag.current;if(!d||d.pointerId!==event.pointerId)return;
        const dimensions=computeDragResizeDimensions({
          drag:{edge:d.edge,startWidth:d.mode.width,startHeight:d.mode.height,startPointerX:d.x,startPointerY:d.y},
          pointerX:event.clientX,pointerY:event.clientY,scale:d.scale,fitWidth:Math.max(0,size.width-40),fitHeight:Math.max(0,size.height-20),
        });
        onChange({type:"device",presetId:"responsive",...dimensions});
      }}
      onPointerUp={event=>finish(event,false)} onPointerCancel={event=>finish(event,true)}
      onLostPointerCapture={event=>finish(event,true)}
      onKeyDown={event=>{
        const amount=event.shiftKey?10:1;
        if(event.key==="Escape"&&drag.current){onChange(drag.current.mode);drag.current=null;return;}
        if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
        event.preventDefault();
        const horizontal=edge!=="bottom",vertical=edge!=="left"&&edge!=="right";
        onChange({type:"device",presetId:"responsive",
          width:viewportDimension(mode.width+(horizontal?(event.key==="ArrowRight"?amount:event.key==="ArrowLeft"?-amount:0):0), "width"),
          height:viewportDimension(mode.height+(vertical?(event.key==="ArrowDown"?amount:event.key==="ArrowUp"?-amount:0):0), "height")});
      }}/>)}
  </div>;
}
