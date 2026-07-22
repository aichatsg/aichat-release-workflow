import { markdownToBlocks } from "@tryfabric/mack";
import axios from "axios";
import he from "he";

export type PostReleaseArgs = {
  webhookUrl: string;
  productName: string;
  tag: string;
  url: string;
  notes: string;
};

const MAX_NOTES_LENGTH = 2800;

function truncate(text: string): string {
  if (text.length <= MAX_NOTES_LENGTH) return text;
  return `${text.slice(0, MAX_NOTES_LENGTH)}\n\n...(truncated)`;
}

/**
 * Posts a formatted release announcement to a Slack Incoming Webhook.
 * Converts the message body from Markdown to Slack Block Kit via @tryfabric/mack.
 */
export async function postReleaseToSlack(args: PostReleaseArgs): Promise<void> {
  const safeReleaseNotes = truncate(he.decode(args.notes ?? ""));

  const message = [
    "@channel",
    `*New Release for AIChat ${args.productName} is out!* 🎉`,
    "",
    `*Version:* ${args.tag}`,
    "",
    safeReleaseNotes,
    "",
    `[View Release in Github](${args.url})`,
  ].join("\n");

  const blocks = await markdownToBlocks(message);

  await axios.post(
    args.webhookUrl,
    { blocks },
    { headers: { "Content-Type": "application/json" } },
  );
}
