import { printData } from "../output.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, requireConfirm } from "./_helpers.js";
import {
  OAuthInitBody, SignupBody, DfyOrderBody, DfyMailboxBody, OpaqueResponse,

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
    .description("Sign up for SalesBlink")
    .usage("--email <email> --password <password> --name <name>")
    .addHelpText("after", `
Required:
  --email <email>       Email
  --password <password> Password
  --name <name>         Name

To view the full API response, append --format json to your command.
`)
    .requiredOption("--email <email>", "Email")
    .requiredOption("--password <password>", "Password")
    .requiredOption("--name <name>", "Name")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ email: opts.email, password: opts.password, name: opts.name }, SignupBody);
      const data = await client.request({ method: "POST", path: "/signup", body });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
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
      const body = pick({ redirect_url: opts.redirectUrl, expiry_minutes: opts.expiryMinutes });
      const data = await client.request({ method: "POST", path: "/login-link", body });
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
      const data = await client.request({ method: "POST", path: "/billing/add-card" });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
    });

  cmd.command("remove-card")
    .description("Get the remove-card login link")
    .usage("[options]")
    .addHelpText("after", "To view the full API response, append --format json to your command.\n")
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: "/billing/remove-card" });
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
    .description("Place a DFY order")
    .usage("[--type <type>] [--from-json <path>]")
    .addHelpText("after", `
Options:
  --type <type>      google | outlook | azure
  --from-json <path> Read request body from JSON file (recommended)

Example:
  salesblink dfy place-order --from-json ./dfy-order.json

To view the full API response, append --format json to your command.
`)
    .option("--type <type>", "google | outlook | azure")
    .option("--from-json <path>", "Read request body from JSON file (recommended)")
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson ? loadJson(opts.fromJson) : pick({ type: opts.type });
      const body = validateBody(raw, DfyOrderBody);
      const data = await client.request({ method: "POST", path: "/dfy/orders", body });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
    });

  cmd.command("add-mailbox")
    .description("Add a mailbox to a DFY order")
    .usage("--order-id <id> [--domain-name <domain>] [--from-json <path>]")
    .addHelpText("after", `
Required:
  --order-id <id>      Order ID

Options:
  --domain-name <domain> Domain name
  --from-json <path>     Read request body from JSON file

Mailbox JSON body:
  {
    "domainName": "example.com",
    "emails": [
      { "username": "jane", "firstName": "Jane", "lastName": "Doe" }
    ]
  }

Example:
  salesblink dfy add-mailbox --order-id <id> --from-json ./dfy-mailboxes.json

To view the full API response, append --format json to your command.
`)
    .requiredOption("--order-id <id>", "Order ID")
    .option("--domain-name <domain>", "Domain name")
    .option("--from-json <path>", "Read request body from JSON file")
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson ? loadJson(opts.fromJson) : pick({ domainName: opts.domainName });
      const body = validateBody(raw, DfyMailboxBody);
      const data = await client.request({ method: "POST", path: `/dfy/orders/${opts.orderId}/mailboxes`, body });
      printData(validated(data, OpaqueResponse), resolveFormat(program));
    });

  cmd.command("cancel-mailbox")
    .description("Cancel a DFY mailbox")
    .usage("--order-id <id> --mailbox-id <id> --confirm")
    .addHelpText("after", `
Required:
  --order-id <id>    Order ID
  --mailbox-id <id>  Mailbox ID
  --confirm          Confirm cancellation

To view the full API response, append --format json to your command.
`)
    .requiredOption("--order-id <id>", "Order ID")
    .requiredOption("--mailbox-id <id>", "Mailbox ID")
    .option("--confirm", "Required confirmation")
    .action(async (opts) => {
      requireConfirm(opts.confirm, `cancel DFY mailbox ${opts.mailboxId}`);
      const client = makeClient(program);
      const data = await client.request({ method: "DELETE", path: `/dfy/orders/${opts.orderId}/mailboxes/${opts.mailboxId}` });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });
}
