import { printData } from "../output.js";
import { validated, validateBody } from "../schemas/validate.js";
import { makeClient, resolveFormat, pick, boolOpt } from "./_helpers.js";
import fs from "fs";
import {

  InboxUpdateBody, InboxReplyBody, InboxForwardBody,

  InboxListResponse, InboxThreadResponse, InboxMutateResponse,
} from "../schemas/inbox.schema.js";

export function registerInboxCommand(program) {
  const cmd = program.command("inbox").description("Unified inbox threads and replies");

  cmd.command("list")
    .description("Get inbox threads (replies by default)")
    .usage("[--type <type>] [--sequence <id>] [--search <q>] [--date <start-end>] [--sender <id>] [--limit <n>] [--skip <n>] [--owned-by <email>]")
    .option("--type <type>", "Thread type: draft, scheduled, or sent (omit for replies)")
    .option("--sequence <id>", "Filter by sequence ID")
    .option("--search <q>", "Search query")
    .option("--date <range>", "Date range as startTimestamp-endTimestamp (Unix ms)")
    .option("--sender <id>", "Filter by sender ID")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--owned-by <email>", "Filter by owner email")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/inbox",
        params: {
          type: opts.type, sequence: opts.sequence, search: opts.search, date: opts.date,
          sender: opts.sender, limit: opts.limit, skip: opts.skip,
          owned_by: opts.ownedBy,
        },
      });
      printData(validated(data, InboxListResponse), resolveFormat(program));
    });

  cmd.command("thread")
    .description("Get messages in a thread")
    .usage("--message-id <id>")
    .requiredOption("--message-id <id>", "Message/thread ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/inbox/${opts.messageId}/thread` });
      printData(validated(data, InboxThreadResponse), resolveFormat(program));
    });

  cmd.command("update")
    .description("Update mail state (unread, outcome)")
    .usage("--message-id <id> [--unread <bool>] [--outcome <outcome>]")
    .requiredOption("--message-id <id>", "Message ID")
    .option("--unread <bool>", "Mark unread (true/false)")
    .option("--outcome <outcome>", "Set outcome")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody(pick({ unread: boolOpt(opts.unread), outcome: opts.outcome }), InboxUpdateBody);
      const data = await client.request({ method: "PATCH", path: `/inbox/${opts.messageId}`, body });
      printData(validated(data, InboxMutateResponse), resolveFormat(program));
    });

  cmd.command("reply")
    .description("Send a reply back to the original contact in a thread")
    .usage("--message-id <id> --content <html-string> [--content-file <path>] [--cc <emails>] [--bcc <emails>]")
    .requiredOption("--message-id <id>", "Message ID of the thread you are replying to")
    .requiredOption("--content <html-string>", "Reply body as raw HTML. Must be quoted in the shell because it contains < and >.")
    .option("--content-file <path>", "Read reply content from this file instead of --content")
    .option("--cc <emails>", "Comma-separated CC emails")
    .option("--bcc <emails>", "Comma-separated BCC emails")
    .addHelpText("after", `
Examples:
  salesblink inbox reply --message-id "abc123" --content "<h1>Thanks for reaching out</h1>"
  salesblink inbox reply --message-id "abc123" --content-file ./reply.html
Notes:
  - A reply is sent back to the original contact in the same thread.
  - Always wrap HTML in double quotes. The characters < and > are shell redirection characters.
`)
    .action(async (opts) => {
      if (opts.contentFile && opts.content) {
        console.error("error: use either --content or --content-file, not both");
        process.exit(1);
      }
      if (opts.contentFile) {
        opts.content = fs.readFileSync(opts.contentFile, "utf8");
      }
      if (!opts.content) {
        console.error("error: --content or --content-file is required");
        process.exit(1);
      }
      const client = makeClient(program);
      const body = validateBody(pick({ content: opts.content, cc: opts.cc, bcc: opts.bcc }), InboxReplyBody);
      const data = await client.request({ method: "POST", path: `/inbox/${opts.messageId}/reply`, body });
      printData(validated(data, InboxMutateResponse), resolveFormat(program));
    });


  cmd.command("forward")
    .description("Forward an email to a different recipient")
    .usage("--message-id <id> [--email <recipient>] [--content <html-string>] [--content-file <path>] [--cc <emails>] [--bcc <emails>]")
    .requiredOption("--message-id <id>", "Message ID of the email you are forwarding")
    .option("--content <html-string>", "Optional note/content as raw HTML. If omitted, the original email body is forwarded.")
    .option("--content-file <path>", "Read optional forward content from this file instead of --content")
    .option("--email <email>", "Recipient email to forward the email to (defaults to the original contact)")
    .option("--cc <emails>", "Comma-separated CC emails")
    .option("--bcc <emails>", "Comma-separated BCC emails")
    .addHelpText("after", `
Examples:
  salesblink inbox forward --message-id "abc123" --email "colleague@example.com"
  salesblink inbox forward --message-id "abc123" --email "colleague@example.com" --content "<h1>Please see below</h1>"
  salesblink inbox forward --message-id "abc123" --email "colleague@example.com" --content-file ./note.html
Notes:
  - A forward sends the original email to a different recipient. Use --email to set the recipient.
  - If --email is omitted, the email is forwarded to the original contact.
  - If --content or --content-file is omitted, the original email body is forwarded as-is.
  - Always wrap HTML in double quotes. The characters < and > are shell redirection characters.
`)
    .action(async (opts) => {
      if (opts.contentFile && opts.content) {
        console.error("error: use either --content or --content-file, not both");
        process.exit(1);
      }
      if (opts.contentFile) {
        opts.content = fs.readFileSync(opts.contentFile, "utf8");
      }
      const client = makeClient(program);
      const body = validateBody(
        pick({ messageID: opts.messageId, content: opts.content, email: opts.email, cc: opts.cc, bcc: opts.bcc }),
        InboxForwardBody
      );
      const data = await client.request({ method: "POST", path: `/inbox/${opts.messageId}/forward`, body });
      printData(validated(data, InboxMutateResponse), resolveFormat(program));
    });

}
