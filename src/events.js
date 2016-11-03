import request from "request";
import URI     from "urijs";
import merge   from "merge";

const uri = process.env.WEBHOOK_URI;

let color = 0x77CBD1;

function esc(str)
{
   return str.replace(/([*#/()[\]_`\\])/g, "\\$&");
}

function sendMessage(content, embeds)
{
   request.post({ uri: uri, json: { content: content, embeds: embeds } },
   function(error, response, body)
   {
      if(error || response.statusCode < 200 || response.statusCode >= 300)
      {
         if(body != undefined)
            console.log("ERROR: \n", body);
         else
            console.log("<error>");
      }
   });
}

function struri(str)
{
   return new URI(str).unicode().toString();
}

function uristr(name, uri)
{
   return "[" + name + "](" + struri(uri) + ")";
}

function clipstr(str, amt)
{
   if(str == null) return str;
   if(str.length > amt)
      str = str.substring(0, amt - 3) + "...";
   return str;
}

function author(name, url, icon_url)
{
   return {
      color: color,
      author: {
         name: name,
         url: url,
         icon_url: icon_url
      }
   };
}

function embed(title, description, url)
{
   return {
      color: color,
      title: title,
      description: description,
      url: url
   };
}

function field(name, value)
{
   return {
      color: color,
      fields: [{
         name: name,
         value: value,
         inline: true
      }]
   };
}

function footer(text, icon_url)
{
   return {
      color: color,
      footer: {
         text: text,
         icon_url: icon_url
      }
   };
}

function prsCommInfo(info)
{
   return {
      id:     info.comment.commit_id.substring(0, 7),
      idLong: info.comment.commit_id,
      uri:    info.comment.html_url,
      body:   esc(info.comment.body)
   };
}

function prsTracInfo(info)
{
   return {
      title:  info.title,
      body:   info.body,
      uristr: uristr("#" + info.number, info.html_url),
      uri:    info.html_url
   };
}

function prsIssuInfo(info)
{
   return prsTracInfo(info.issue);
}

function prsPullInfo(info)
{
   return prsTracInfo(info.pull_request);
}

function prsRepoInfo(info)
{
   return {
      shortname: info.repository.name,
      name:   info.repository.full_name,
      avatar: info.repository.owner.avatar_url,
      uri:    info.repository.html_url,
      uristr: uristr(info.repository.full_name, info.repository.html_url),
      mai:    "**" +
              uristr(info.repository.full_name, info.repository.html_url) +
              "**:"
   };
}

function prsUserInfo(info)
{
   return {
      user:    info.login,
      userUri: info.html_url,
      avatar:  info.avatar_url,
      uristr:  uristr(info.login, info.html_url)
   };
}

function prsSendInfo(info)
{
   return prsUserInfo(info.sender);
}

function issueInfo(info, issu)
{
   const repo = prsRepoInfo(info);
   const send = prsSendInfo(info);

   let outp = null;

   switch(info.action)
   {
   case "opened":
      const body = clipstr(issu.body, 128);
      outp = merge(true,
         author(send.user, send.uri, send.avatar),
         field(esc(issu.title), body ? body : "<no description>")
      );
      break;
   case "labeled": case "unlabeled":
      const tmp = color;
      const uri = struri(`${repo.uri}/labels/${info.label.name}`);
      const tag = info.action[0].toUpperCase() + info.action.substring(1);

      color = parseInt(info.label.color, 16);
      outp = embed(`${tag} **${info.label.name}**`, null, uri);
      color = tmp;
      break;
   case "assigned": case "unassigned":
      let user = prsUserInfo(info.assignee);
      outp =
         author(`${user.user} was ${info.action}`, user.uri, user.avatar);
      break;
   }
   return outp;
}

function commitMsg(repo, commit)
{
   const shorthash = commit.id.substring(0, 7);
   const uri  = struri(`${repo.uri}/commit/${commit.id}`);
   const msg  = esc(clipstr(commit.message.split(/\r?\n/)[0], 64));
   const name = esc(commit.author.name);
   return `${uristr(`\`${shorthash}\``, uri)} ${msg} - *${name}*\n`;
}

export default class Events
{
   static commit_comment(info)
   {
      const comm = prsCommInfo(info);
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);

      const comment = uristr("comment", comm.uri);
      const commit  = uristr(comm.id, `${repo.uri}/commit/${comm.idLong}`);

      sendMessage(`${repo.mai} New ${comment} on commit **${commit}**`,
         [merge(true,
            author(send.user, send.uri, send.avatar),
            footer(clipstr(comm.body, 80))
         )]);
   }

   static create(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);

      const type   = info.ref_type;
      const ref    = info.ref;
      const refmsg = (ref != null) ? (": **" + ref + "**") : "";

      sendMessage(
         `${send.uristr} created a new ${type} on ${repo.uristr}${refmsg}`);
   }

   static delete(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);

      const type   = info.ref_type;
      const ref    = info.ref;
      const refmsg = (ref != null) ? (": **" + ref + "**") : "";

      sendMessage(
         `${send.uristr} deleted a ${type} on ${repo.uristr}${refmsg}`);
   }

   static fork(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);

      const fork = uristr(info.forkee.full_name, info.forkee.html_url);

      sendMessage(`**${send.uristr}** forked ${repo.uristr} into **${fork}**`);
   }

   static issue_comment(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);
      const user = prsUserInfo(info.comment.user);
      const issu = prsIssuInfo(info);

      let outp = null;
      let msg = null;

      switch(info.action)
      {
      case "created":
      {
         const comment = uristr("comment", info.comment.html_url);
         msg = `New ${comment} on issue **${issu.uristr}**`;
         outp = merge(true,
            author(user.user, user.uri, user.avatar),
            footer(clipstr(info.comment.body, 80))
         );
         break;
      }
      case "edited":
      {
         const comm = uristr("Comment", info.comment.html_url);
         msg = `${comm} on issue **${issu.uristr}** edited by ${send.uristr}`;
         break;
      }
      case "deleted":
         msg = `Comment on issue **${issu.uristr}** deleted by ${send.uristr}`;
         break;
      }

      sendMessage(`${repo.mai} ${msg}`, outp ? [outp] : null);
   }

   static issues(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);
      const issu = prsIssuInfo(info);
      const outp = issueInfo(info, issu);

      sendMessage(
         `${repo.mai} Issue **${issu.uristr}** ` +
         `${info.action} by ${send.uristr}`,
         outp ? [outp] : null);
   }

   static member(info)
   {
      const repo = prsRepoInfo(info);
      const user = prsUserInfo(info.member);
      sendMessage(`${user.uristr} was added to ${repo.uristr}`);
   }

   static milestone(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);

      const mstone = uristr(info.milestone.title, info.milestone.html_url);
      const action = info.action;

      sendMessage(
         `${repo.mai} Milestone ${mstone} ${action} by ${send.uristr}`);
   }

   static public(info)
   {
      sendMessage(`${prsRepoInfo(info).uristr} has been made public`);
   }

   static pull_request_review(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);
      const pull = prsPullInfo(info);

      let statename = info.review.state;
      if(statename == "changes_requested") statename = "denied";

      const state = uristr(statename, info.review.html_url);
      const body = clipstr(info.review.body, 80);

      sendMessage(
         `${repo.mai} Pull request **${pull.uristr}** ${state}`,
         [merge(true, 
            author(send.user, send.uri, send.avatar),
            footer(clipstr(body ? body : "<no description>", 80))
         )]);
   }

   static pull_request(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);
      const pull = prsPullInfo(info);

      let outp = null;
      let msg =
         `Pull request **${pull.uristr}** ${info.action} by ${send.uristr}`;

      if(info.pull_request.merged && info.action == "closed")
         msg = `Pull request **${pull.uristr}** merged by ${send.uristr}`;
      else
         outp = issueInfo(info, pull);

      sendMessage(`${repo.mai} ${msg}`, outp ? [outp] : null);
   }

   static push(info)
   {
      if(info.created || info.deleted)
         return;

      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);
      const name = `${repo.shortname}/${info.ref.split("/")[2]}`;
      const s = info.commits.length != 1 ? "s" : "";
      const parm = "";

      if(info.forced)
         parm = "(force pushed)";

      let commits = "";
      if(info.commits.length >= 10)
      {
         let omitted = info.commits.length - 8;

         for(let i = 0; i < 4; i++)
            commits += commitMsg(repo, info.commits[i]);

         commits += `(*${omitted} more commits*)\n`;

         for(let i = omitted + 4; i < info.commits.length; i++)
            commits += commitMsg(repo, info.commits[i]);
      }
      else for(let i = 0; i < info.commits.length; i++)
         commits += commitMsg(repo, info.commits[i]);

      const uri = info.compare;

      sendMessage(null, [merge(true,
         author(send.user, send.uri, send.avatar),
         embed(`[${name}] ${info.commits.length} new commit${s} ${parm}`,
            commits, uri)
      )]);
   }

   static release(info)
   {
      const repo = prsRepoInfo(info);
      const tag = uristr(info.release.tag_name, info.release.html_url);
      sendMessage(`${repo.mai} ${tag} released`);
   }

   static watch(info)
   {
      const repo = prsRepoInfo(info);
      const send = prsSendInfo(info);

      sendMessage(`${repo.uristr} was starred by ${send.uristr}`);
   }

   static ping(info) {}
   static gollum(info) {}
   static status(info) {}
   static team_add(info) {}
   static repository(info) {}
   static deployment(info) {}
   static membership(info) {}
   static page_build(info) {}
   static deployment_status(info) {}
   static pull_request_review_comment(info) {}
}
