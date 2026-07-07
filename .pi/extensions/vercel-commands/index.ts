import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

const baseDir = dirname(fileURLToPath(import.meta.url));
const contentsDir = join(baseDir, "contents");

type LoadedCommand = {
  name: string;
  description: string;
  markdown: string;
};

function toCommandName(fileName: string): string {
  const suffix = parse(fileName).name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `vercel-${suffix}`;
}

function extractDescription(markdown: string, commandName: string): string {
  const frontmatter = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const description = frontmatter?.[1]
    ?.match(/^description:\s*(?:"([^"]*)"|'([^']*)'|(.+))\s*$/m)
    ?.slice(1)
    .find((value) => value !== undefined)
    ?.trim();

  return description || `Run ${commandName}.`;
}

async function loadCommands(): Promise<LoadedCommand[]> {
  const entries = await readdir(contentsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    files.map(async (fileName) => {
      const markdown = (await readFile(join(contentsDir, fileName), "utf8")).trim();
      const name = toCommandName(fileName);

      return {
        name,
        description: extractDescription(markdown, name),
        markdown,
      };
    }),
  );
}

export default async function vercelCommands(pi: ExtensionAPI) {
  const commands = await loadCommands();

  for (const { name, description, markdown } of commands) {
    pi.registerCommand(name, {
      description,
      handler: async (args, ctx) => {
        const userPrefix = args.trim();

        const message = userPrefix
          ? `${userPrefix}\n\n---\n\n${markdown}`
          : markdown;

        if (!message.trim()) {
          ctx.ui.notify("No prompt text to send", "warning");
          return;
        }

        if (ctx.isIdle()) {
          pi.sendUserMessage(message);
        } else {
          pi.sendUserMessage(message, { deliverAs: "followUp" });
          ctx.ui.notify("Queued prompt as a follow-up message", "info");
        }
      },
    });
  }
}
