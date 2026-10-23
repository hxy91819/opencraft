import test from 'node:test';
import assert from 'node:assert/strict';
import { once, EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket, { WebSocketServer } from 'ws';
import { WeComPlugin } from '../../plugins/wecom/src/server';
import type { ImMessage } from '../../plugins/im/src/server';

async function fixture(t:any) {
  const server=new WebSocketServer({port:0,host:'127.0.0.1'}); await once(server,'listening');
  const frames:any[]=[], messages:ImMessage[]=[], errors:string[]=[]; let peer:WebSocket;
  server.on('connection',socket => { peer=socket; socket.on('message',raw => {const frame=JSON.parse(raw.toString()); frames.push(frame); socket.send(JSON.stringify({headers:frame.headers,errcode:0}));}); });
  const address=server.address() as {port:number};
  const plugin=new WeComPlugin({botId:'fixture-bot',secret:'fixture-secret',receive:async m => {messages.push(m);},onError:code=>errors.push(code)},() => new WebSocket(`ws://127.0.0.1:${address.port}`));
  t.after(async () => { plugin.close(); for(const socket of server.clients) socket.terminate(); await new Promise<void>(r=>server.close(()=>r())); });
  const until=async (check:()=>boolean) => {for(let n=0;n<100 && !check();n++) await delay(10); assert.ok(check());};
  plugin.start(); await until(()=>plugin.state==='ready');
  const callback=(req:string,body:unknown) => peer.send(JSON.stringify({cmd:'aibot_msg_callback',headers:{req_id:req},body}));
  return {plugin,frames,messages,errors,until,callback,disconnect:()=>peer.terminate()};
}
const body={msgid:'m1',aibotid:'fixture-bot',chattype:'group',chatid:'chat',from:{userid:'external'},msgtype:'text',text:{content:'hello'}};

test('a callback immediately following the subscription ACK in one receive batch is admitted',async t => {
  const frames:any[]=[], messages:ImMessage[]=[];
  class Socket extends EventEmitter {
    readyState=WebSocket.OPEN;
    send(frame:string,callback?:(error?:Error)=>void) {frames.push(JSON.parse(frame)); callback?.();}
    terminate() {this.emit('close');}
  }
  const socket=new Socket();
  const plugin=new WeComPlugin({botId:'fixture-bot',secret:'fixture-secret',receive:async message=>{messages.push(message);}},()=>socket as unknown as WebSocket);
  t.after(()=>plugin.close()); plugin.start(); socket.emit('open');
  socket.emit('message',Buffer.from(JSON.stringify({headers:frames[0].headers,errcode:0})));
  socket.emit('message',Buffer.from(JSON.stringify({cmd:'aibot_msg_callback',headers:{req_id:'immediate'},body})));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(plugin.state,'ready'); assert.equal(messages.length,1); assert.equal(messages[0].id,'m1');
});

test('WeCom connects, subscribes, normalizes text and awaits ACKs on the original reply request',async t => {
  const f=await fixture(t); assert.equal(f.frames[0].cmd,'aibot_subscribe');
  assert.deepEqual(f.frames[0].body,{bot_id:'fixture-bot',secret:'fixture-secret'});
  f.callback('callback-1',body); await f.until(()=>f.messages.length===1);
  assert.deepEqual(f.messages[0].source,{chatId:'chat',chatType:'group',senderId:'external'});
  await f.messages[0].accepted!(); await f.messages[0].reply('answer');
  const replies=f.frames.filter(frame=>frame.cmd==='aibot_respond_msg');
  assert.equal(replies.length,2); assert.ok(replies.every(frame=>frame.headers.req_id==='callback-1'));
  assert.equal(replies[0].body.stream.finish,false); assert.equal(replies[1].body.stream.finish,true);
  assert.equal(replies[0].body.stream.id,replies[1].body.stream.id);
  await assert.rejects(f.messages[0].reply('duplicate'));
});

test('old callback closures cannot send on a replacement connection; stop prevents reconnect',async t => {
  const f=await fixture(t); f.callback('old',body); await f.until(()=>f.messages.length===1);
  f.disconnect(); await f.until(()=>f.plugin.state==='disconnected');
  await assert.rejects(f.messages[0].reply('late'));
  f.plugin.close(); await delay(1100); assert.equal(f.frames.filter(frame=>frame.cmd==='aibot_subscribe').length,1);
});

test('mixed and direct callbacks retain the external sender, unsupported content is ignored',async t => {
  const f=await fixture(t);
  f.callback('mixed',{...body,chattype:'single',chatid:undefined,msgtype:'mixed',mixed:{msg_item:[{msgtype:'text',text:{content:'one'}},{msgtype:'image'},{msgtype:'text',text:{content:'two'}}]}});
  f.callback('image',{...body,msgtype:'image'}); await f.until(()=>f.messages.length===1);
  assert.equal(f.messages[0].text,'one\ntwo'); assert.deepEqual(f.messages[0].source,{chatId:'external',chatType:'direct',senderId:'external'});
});

test('group bot mentions permit binding commands while ordinary text and direct mentions remain intact',async t => {
  const f=await fixture(t);
  f.callback('new',{...body,msgid:'new',text:{content:'@RobotA /new'}});
  f.callback('switch',{...body,msgid:'switch',text:{content:'@RobotA /switch opencraft://conversation/v1/server/thread'}});
  f.callback('prose',{...body,msgid:'prose',text:{content:'  @RobotA explain this  '}});
  f.callback('direct',{...body,msgid:'direct',chattype:'single',text:{content:'@RobotA /new'}});
  await f.until(()=>f.messages.length===4);
  assert.deepEqual(f.messages.map(message=>message.text),['/new','/switch opencraft://conversation/v1/server/thread','  @RobotA explain this  ','@RobotA /new']);
});
