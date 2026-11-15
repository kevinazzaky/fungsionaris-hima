import { createServer, request as forward, type OutgoingHttpHeaders } from "node:http";

export type FaultMode = "none" | "slow" | "drop-before" | "drop-after" | "offline-after" | "expired";
export function createVotingFaultProxy(upstream: string, expireToken?: (token: string) => string) {
  const target=new URL(upstream);
  if(target.protocol!=="http:" || target.hostname!=="127.0.0.1")throw new Error("Proxy tes hanya boleh meneruskan ke loopback.");
  let mode:FaultMode="none", dropped=false;
  const events:{path:string;method:string;fault:string;status?:number;forwarded:boolean}[]=[];
  const server=createServer((req,res)=>{
    const handle=async()=>{
      const address=server.address();
      if(!address || typeof address==="string")return res.destroy();
      const origin=`http://127.0.0.1:${address.port}`;
      if(!req.url?.startsWith("/") || req.url.startsWith("//")){res.writeHead(400);res.end();return;}
      if(req.headers.host!==`127.0.0.1:${address.port}` || (req.method==="POST" && req.headers.origin!==origin)){
        res.writeHead(403);res.end();return;
      }
      const path=(req.url||"/").split("?")[0];
      const cast=req.method==="POST" && path==="/api/voting/ballots";
      const status=req.method==="POST" && path==="/api/voting/status";
      const event={path,method:req.method||"GET",fault:mode,forwarded:false,status:undefined as number|undefined};
      if(cast || status || path==="/api/voting/check")events.push(event);
      if((cast && mode==="drop-before") || (status && mode==="offline-after") || (cast && dropped && ["drop-after","offline-after"].includes(mode))){
        res.destroy();return;
      }
      if(cast && mode==="slow")await new Promise(resolve=>setTimeout(resolve,2500));
      const headers:OutgoingHttpHeaders={...req.headers,host:target.host,"accept-encoding":"identity"};
      delete headers["x-forwarded-host"];delete headers["x-forwarded-proto"];
      if(req.headers.origin)headers.origin=target.origin;
      event.forwarded=true;
      const response=forward(new URL(req.url||"/",target),{method:req.method,headers},upstreamResponse=>{
        const parts:Buffer[]=[];
        upstreamResponse.on("data",chunk=>parts.push(Buffer.from(chunk)));
        upstreamResponse.on("end",()=>{
          event.status=upstreamResponse.statusCode||502;
          if(cast && ["drop-after","offline-after"].includes(mode) && event.status===200){dropped=true;res.destroy();return;}
          let body=Buffer.concat(parts);
          const outgoing:OutgoingHttpHeaders={...upstreamResponse.headers};
          delete outgoing["transfer-encoding"];delete outgoing.connection;delete outgoing["keep-alive"];
          if(mode==="expired" && path==="/api/voting/check" && event.status===200 && expireToken){
            const value=JSON.parse(body.toString());
            if(typeof value.token==="string")value.token=expireToken(value.token);
            body=Buffer.from(JSON.stringify(value));
          }
          outgoing["content-length"]=body.length;
          res.writeHead(event.status,outgoing);res.end(body);
        });
        upstreamResponse.on("error",()=>res.destroy());
      });
      response.on("error",()=>res.destroy());
      req.pipe(response);
    };
    void handle().catch(()=>res.destroy());
  });
  return {server,events,setMode(value:FaultMode){mode=value;dropped=false;}};
}
