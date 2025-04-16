import { WorkerUtil } from "./WorkerUtil";

// Constants
let STORE_KV: KVNamespace;
let UNINOTIFY_KEY: string;
const UNINOTIFY_API = "https://notify.waynecommand.com/wechat"

// 验证授权
async function isAuthorized(apiKey: string|null): Promise<boolean> {
  if (!apiKey) return false;
  return true;
}

// Main handler
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      // init
      STORE_KV = env.STORE_KV
      UNINOTIFY_KEY = env.UNINOTIFY_KEY
      const url = new URL(request.url);
      const apiKey = await getRequestApiKey(request);


      // simple auth
      if (!isAuthorized(apiKey)) {
        return new Response("Unauthorized", { status: 401 });
      }

      // 用户信息
      const userRecord = await getUserInfo(apiKey);
    
      // router

      // 从这里以下的都需要实有用户
      if (!userRecord) {
        return new Response("Unauthorized", { status: 401 });
      }

      // ddns record list
      if (url.pathname === "/records") {
        if (request.method !== "GET") {
          return new Response("Method Not Allowed", { status: 405 });
        }

        return records(userRecord);
      }

      // "/{identifier}"
      if (url.pathname.lastIndexOf("/") === 0) {
        if (request.method !== "POST") {
          return new Response("Method Not Allowed", { status: 405 });
        }
        const identifier = url.pathname.replace("/", "");
        const ip = WorkerUtil.getRemoteIP(request) || "err";
        return updateDDNSRecord(identifier, ip, userRecord);
      }

      return new Response("Not Found", { status: 404 });
    },
};

async function getRequestApiKey(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}

// 获取用户信息
async function getUserInfo(apiKey: string|null): Promise<UserRecord | null> {
  if (!apiKey) return null;

  const userRecord: UserRecord | null = await STORE_KV.get(`gh_${apiKey}`, { type: "json" });

  return userRecord;
}

// update ddns record
async function updateDDNSRecord(identifier: string, ip: string, userRecord: UserRecord): Promise<Response> {
  const record: DdnsRecord[] = userRecord[identifier];

  // 如果有记录，对比当前的IP是否是最新的，如果是最新的，则忽略此次请求
  if (record) {
    if (record[0].hasOwnProperty(ip)) {

      return new Response("Current records are up to date", { status: 200 });
    }else {
      // 更新记录
      record.unshift({[ip]: new Date().getTime().toString()});
      console.log(`Record updated [${identifier}]: `, ip);
    }
  }else {
    // 创建记录
    userRecord[identifier] = [{[ip]: new Date().getTime().toString()}];
    console.log(`Record created [${identifier}]: `, ip);
  }

  // 更新用户记录
  await STORE_KV.put(`gh_${userRecord.api_key}`, JSON.stringify(userRecord));

  // 通知
  await uninotify(identifier, ip);
  
  return new Response("Record updated", { status: 200 });
}

async function records(userRecord: UserRecord): Promise<Response> {

  const { api_key, _create_at, ...rs } = userRecord;

  return Response.json(rs)
}


async function uninotify(identifier: string, ip: string) {
  if (!UNINOTIFY_KEY) return;
  
  await fetch(UNINOTIFY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${UNINOTIFY_KEY}`
    },
    body: JSON.stringify({
      title: `${identifier} Record Updated`,
      content: `DDNS Record Updated: ${identifier} -> ${ip}`
    })
  }).catch(e => {
    console.error(`Failed to notify [${identifier}]`, e);
  });

  return 0
}


interface UserRecord {
  [key: string]: DdnsRecord[];
}

interface DdnsRecord {
  [key: string]: string;
}