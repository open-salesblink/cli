import { printData } from "../output.js";
import { CliError } from "../client.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, boolOpt, requireConfirm } from "./_helpers.js";
import {
  UserCreateBody, UserUpdateBody, UsersListResponse, UserGetResponse, UserMutateResponse,
  WorkspaceCreateBody, WorkspaceUpdateBody, WorkspacesListResponse, WorkspaceMutateResponse,
  KeyCreateBody, KeysListResponse, KeyMutateResponse,
} from "../schemas/admin.schema.js";

export function registerUsersCommand(program) {
  const cmd = program.command("users").description("Manage team users");

  cmd.command("list")
    .description("Get all users (no server-side filtering or pagination)")
    .usage("[--owned-by <email>]")
    .option("--owned-by <email>", "Filter by owner email")
    .addHelpText("after", `
Note: the API returns every user in the account. Limit/skip/search/starred/archived parameters are accepted for compatibility but currently have no effect.

To view the full API response, append --format json to your command.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/users", params: { owned_by: opts.ownedBy } });
      printData(validated(data, UsersListResponse), resolveFormat(program));
    });

  cmd.command("get")
    .description("Get a specific user")
    .usage("--id <id>")
    .addHelpText("after", `
Required:
  --id <id>      User ID

To view the full API response, append --format json to your command.
`)
    .requiredOption("--id <id>", "User ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/users" });
      if (data && Array.isArray(data.data)) {
        const match = data.data.find((u) => u.id === opts.id || u._id === opts.id || u.userId === opts.id);
        if (!match) {
          throw new CliError(`User with id ${opts.id} not found`);
        }
        data.data = match;
      }
      printData(validated(data, UserGetResponse), resolveFormat(program));
    });

  cmd.command("add")
    .description("Add a user")
    .usage("--email <email> [--role <role>] [--url <url>]")
    .addHelpText("after", `
Required:
  --email <email>  User email

Options:
  --role <role>    client | user | admin | developer
  --url <url>      Invite URL

To view the full API response, append --format json to your command.
`)
    .requiredOption("--email <email>", "User email")
    .option("--role <role>", "client | user | admin | developer")
    .option("--url <url>", "Invite URL")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody(pick({ email: opts.email, role: opts.role, url: opts.url }), UserCreateBody);
      const data = await client.request({ method: "POST", path: "/users", body });
      printData(validated(data, UserMutateResponse), resolveFormat(program));
    });

  cmd.command("update")
    .description("Update a user")
    .usage("--id <id> [--name <name>] [--role <role>] [--from-json <path>]")
    .addHelpText("after", `
Required:
  --id <id>        User ID

Options:
  --name <name>    Name
  --role <role>    client | user | admin | developer
  --from-json <path>  Read request body from JSON file

To view the full API response, append --format json to your command.
`)
    .requiredOption("--id <id>", "User ID")
    .option("--name <name>", "Name")
    .option("--role <role>", "client | user | admin | developer")
    .option("--from-json <path>", "Read request body from JSON file")
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson ? loadJson(opts.fromJson) : pick({ name: opts.name, role: opts.role });
      const body = validateBody(raw, UserUpdateBody);
      const data = await client.request({ method: "PATCH", path: `/users/${opts.id}`, body });
      printData(validated(data, UserMutateResponse), resolveFormat(program));
    });
}

export function registerWorkspacesCommand(program) {
  const cmd = program.command("workspaces").description("Manage workspaces");

  cmd.command("list")
    .description("Get all workspaces")
    .usage("[--owned-by <email>]")
    .option("--owned-by <email>", "Filter by owner email")
    .addHelpText("after", "To view the full API response, append --format json to your command.\n")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/workspaces", params: { owned_by: opts.ownedBy } });
      printData(validated(data, WorkspacesListResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create a workspace")
    .usage("--name <name>")
    .addHelpText("after", `
Required:
  --name <name>    Workspace name

To view the full API response, append --format json to your command.
`)
    .requiredOption("--name <name>", "Workspace name")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ name: opts.name }, WorkspaceCreateBody);
      const data = await client.request({ method: "POST", path: "/workspaces", body });
      printData(validated(data, WorkspaceMutateResponse), resolveFormat(program));
    });

  cmd.command("update")
    .description("Update a workspace")
    .usage("--id <id> --name <name>")
    .addHelpText("after", `
Required:
  --id <id>        Workspace ID
  --name <name>    Workspace name

To view the full API response, append --format json to your command.
`)
    .requiredOption("--id <id>", "Workspace ID")
    .requiredOption("--name <name>", "Workspace name")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ name: opts.name }, WorkspaceUpdateBody);
      const data = await client.request({ method: "PATCH", path: `/workspaces/${opts.id}`, body });
      printData(validated(data, WorkspaceMutateResponse), resolveFormat(program));
    });
}

export function registerKeysCommand(program) {
  const cmd = program.command("keys").description("Manage API keys");

  cmd.command("list")
    .description("Get API keys")
    .usage("[options]")
    .addHelpText("after", "To view the full API response, append --format json to your command.\n")
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/keys" });
      printData(validated(data, KeysListResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create an API key")
    .usage("--name <name>")
    .addHelpText("after", `
Required:
  --name <name>    Key name

To view the full API response, append --format json to your command.
`)
    .requiredOption("--name <name>", "Key name")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ name: opts.name }, KeyCreateBody);
      const data = await client.request({ method: "POST", path: "/keys", body });
      printData(validated(data, KeyMutateResponse), resolveFormat(program));
    });

  cmd.command("delete")
    .description("Delete an API key")
    .usage("--id <id> --confirm")
    .addHelpText("after", `
Required:
  --id <id>      Key ID
  --confirm      Confirm the deletion

To view the full API response, append --format json to your command.
`)
    .requiredOption("--id <id>", "Key ID")
    .option("--confirm", "Required confirmation")
    .action(async (opts) => {
      requireConfirm(opts.confirm, `delete API key ${opts.id}`);
      const client = makeClient(program);
      const data = await client.request({ method: "DELETE", path: `/keys/${opts.id}` });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("refresh")
    .description("Refresh an API key")
    .usage("--id <id>")
    .addHelpText("after", `
Required:
  --id <id>      Key ID

To view the full API response, append --format json to your command.
`)
    .requiredOption("--id <id>", "Key ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: `/keys/${opts.id}/refresh` });
      printData(validated(data, KeyMutateResponse), resolveFormat(program));
    });
}
