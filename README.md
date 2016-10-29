# UNATCORelay

UNATCORelay is a Node server that you can use to route GitHub messages to Discord channels via webhooks.

UNATCORelay works per-channel (hook) and accepts any messages as long as they are validated as coming from GitHub.

This may be a bit awkward for some but I am a busy man and this suits my needs, so please do use the issue tracker
and pull requests if you need features added.

## Environment Configuration

- `WEBHOOK_PORT`: Port to host on. Required.
- `WEBHOOK_URI`: URI for the webhook to send to. Required.
- `GITHUB_SECRET`: Secret key for validating requests. Not required, but *heavily recommended*.
- `VHOST`: Virtual host to respond from. Recommended if you use your own subdomain.

### Example

```
npm update
WEBHOOK_PORT=80 WEBHOOK_URI='https://canary.discordapp.com/api/webhooks/whatever' GITHUB_SECRET='whatever' VHOST='whatever.wherever.com' npm run start
```
