import bodyParser from "body-parser";
import Events     from "./events";
import express    from "express";
import crypto     from "crypto-js";
import bufeq      from "buffer-equal-constant-time";

const env   = process.env;
const vhost = env.VHOST;
const port  = parseInt(env.WEBHOOK_PORT);

function verifyRequest(req)
{
   const hmac = crypto.HmacSHA1(req.body, env.GITHUB_SECRET);

   const hash    = new Buffer("sha1=" + crypto.enc.Hex.stringify(hmac));
   const reqhash = new Buffer(req.get("X-Hub-Signature"));

   return bufeq(hash, reqhash);
}

function handleRequest(req, res)
{
   if(req.body == null || (vhost && req.hostname != vhost)) return;

   if(env.GITHUB_SECRET && !verifyRequest(req))
      res.sendStatus(500);
   else
   {
      const event = req.get("X-GitHub-Event");

      if(event)
      {
         Events[event](JSON.parse(req.body));
         res.sendStatus(200);
      }
      else
         res.sendStaus(400);
   }
}

function main()
{
   express()
   .use(bodyParser.text({type: "application/json"}))
   .post("/", handleRequest)
   .listen(port);
}

main();
