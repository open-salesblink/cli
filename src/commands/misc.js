import { printData } from "../output.js";
import { validated, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, pick } from "./_helpers.js";
import {
  OAuthInitBody, OpaqueResponse,

  AccountVerifyResponse,

} from "../schemas/misc.schema.js";

export function registerAuthCommand(program) {
  const cmd = program.command("auth").description("OAuth initialization and signup");

  cmd.command("google")
    .description("Initialize Google OAuth (returns auth URL to open in browser)")
    .usage("[options]")
    .addHelpText("after", `
The API ignores any custom redirect URL and always returns the auth_url in the response.
Open the returned URL in a browser to connect the Gmail/G Suite sender.

To view the full API response, append --format json to your command.
`)
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: "/oauth/google" });
      const parsed = validated(data, OpaqueResponse);
      const url = parsed.data?.auth_url ?? parsed.data?.url ?? parsed.data;
      process.stdout.write(`${url}\n`);
      process.stderr.write(`\nOpen the URL above in your browser to authenticate. The sender will be created automatically after OAuth.\n`);
    });

  cmd.command("outlook")
    .description("Initialize Outlook OAuth (returns auth URL to open in browser)")
    .usage("[options]")
    .addHelpText("after", `
The API ignores any custom redirect URL and always returns the auth_url in the response.
Open the returned URL in a browser to connect the Microsoft Outlook sender.

To view the full API response, append --format json to your command.
`)
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: "/oauth/outlook" });
      const parsed = validated(data, OpaqueResponse);
      const url = parsed.data?.auth_url ?? parsed.data?.url ?? parsed.data;
      process.stdout.write(`${url}\n`);
      process.stderr.write(`\nOpen the URL above in your browser to authenticate. The sender will be created automatically after OAuth.\n`);
    });

  cmd.command("signup")
    .description("Get the public sign-up link")
    .usage("[options]")
    .addHelpText("after", `
The public sign-up endpoint returns a link to the SalesBlink web UI where the user can create an account.

To view the full API response, append --format json to your command.
`)
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/signup-link" });
      printData(data, resolveFormat(program));
    });


  cmd.command("verify")
    .description("Verify API key and return account info")
    .usage("[options]")
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/account/verify" });
      printData(validated(data, AccountVerifyResponse), resolveFormat(program));
    });

  cmd.command("login-link")
    .description("Generate a time-limited magic login link")
    .usage("[--redirect-url <path>] [--expiry-minutes <n>]")
    .addHelpText("after", `
Options:
  --redirect-url <path>   Relative path or full URL to redirect after login (default: /magic)
  --expiry-minutes <n>    Link validity in minutes, 1-30 (default: 5)

To view the full API response, append --format json to your command.
`)
    .option("--redirect-url <url>", "Redirect path or URL after login")
    .option("--expiry-minutes <n>", "Link validity in minutes (1-30)", parseInt)
    .action(async (opts) => {
      const client = makeClient(program);
      const params = pick({ redirect_url: opts.redirectUrl, expiry_minutes: opts.expiryMinutes });
      const data = await client.request({ path: "/login-link", params });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
    });

}

export function registerBillingCommand(program) {
  const cmd = program.command("billing").description("Billing card management links");

  cmd.command("add-card")
    .description("Get the add-card login link")
    .usage("[options]")
    .addHelpText("after", "To view the full API response, append --format json to your command.\n")
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/billing/add-card-link" });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
    });

  cmd.command("remove-card")
    .description("Get the remove-card login link")
    .usage("[options]")
    .addHelpText("after", "To view the full API response, append --format json to your command.\n")
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/billing/remove-card-link" });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
    });
}

export function registerDfyCommand(program) {
  const cmd = program.command("dfy").description("Done-For-You mailbox orders");

  cmd.command("orders")
    .description("Get DFY orders")
    .usage("[options]")
    .addHelpText("after", "To view the full API response, append --format json to your command.\n")
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/dfy/orders" });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
    });

  cmd.command("place-order")
    .description("Get the DFY order login link")
    .usage("[options]")
    .addHelpText("after", `
The public DFY order endpoint returns a magic login link to the email-sender connection page in the SalesBlink web UI.

To view the full API response, append --format json to your command.
`)
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/dfy/order-link" });
      printData(data, resolveFormat(program));
    });

  cmd.command("add-mailbox")
    .description("Get the DFY add-mailbox login link")
    .usage("--order-id <id> [options]")
    .addHelpText("after", `
Required:
  --order-id <id>      Order ID

The public endpoint returns a magic login link to the billing subscriptions page in the SalesBlink web UI.

To view the full API response, append --format json to your command.
`)
    .requiredOption("--order-id <id>", "Order ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/dfy/orders/${opts.orderId}/mailbox-link` });
      printData(data, resolveFormat(program));
    });

  cmd.command("cancel-mailbox")
    .description("Get the DFY mailbox cancel login link")
    .usage("--order-id <id> --mailbox-id <id>")
    .addHelpText("after", `
Required:
  --order-id <id>    Order ID
  --mailbox-id <id>  Mailbox ID

The public endpoint returns a magic login link to the billing subscriptions page in the SalesBlink web UI.

To view the full API response, append --format json to your command.
`)
    .requiredOption("--order-id <id>", "Order ID")
    .requiredOption("--mailbox-id <id>", "Mailbox ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/dfy/orders/${opts.orderId}/mailboxes/${opts.mailboxId}/cancel-link` });
      printData(data, resolveFormat(program));
    });
}
