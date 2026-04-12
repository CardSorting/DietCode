import type { ClineMessage } from "./ExtensionMessage";

/**
 * Combines API request start and finish messages in an array of ClineMessages.
 *
 * This function looks for pairs of 'api_req_started' and 'api_req_finished' messages.
 * When it finds a pair, it combines them into a single 'api_req_combined' message.
 * The JSON data in the text fields of both messages are merged.
 *
 * @param messages - An array of ClineMessage objects to process.
 * @returns A new array of ClineMessage objects with API requests combined.
 *
 * @example
 * const messages = [
 *   { type: "say", say: "api_req_started", text: '{"request":"GET /api/data"}', ts: 1000 },
 *   { type: "say", say: "api_req_finished", text: '{"cost":0.005}', ts: 1001 }
 * ];
 * const result = combineApiRequests(messages);
 * // Result: [{ type: "say", say: "api_req_started", text: '{"request":"GET /api/data","cost":0.005}', ts: 1000 }]
 */
export function combineApiRequests(messages: ClineMessage[]): ClineMessage[] {
  const combinedApiRequests: ClineMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msgI = messages[i];
    if (msgI && msgI.type === "say" && msgI.say === "api_req_started") {
      const startedRequest = JSON.parse(msgI.text || "{}");
      let j = i + 1;

      while (j < messages.length) {
        const msgJ = messages[j];
        if (msgJ && msgJ.type === "say" && msgJ.say === "api_req_finished") {
          const finishedRequest = JSON.parse(msgJ.text || "{}");
          const combinedRequest = {
            ...startedRequest,
            ...finishedRequest,
          };

          combinedApiRequests.push({
            ...msgI,
            text: JSON.stringify(combinedRequest),
          });

          i = j; // Skip to the api_req_finished message
          break;
        }
        j++;
      }

      if (j === messages.length) {
        // If no matching api_req_finished found, keep the original api_req_started
        combinedApiRequests.push(msgI);
      }
    }
  }

  // Replace original api_req_started and remove api_req_finished
  return messages
    .filter((msg) => !(msg.type === "say" && msg.say === "api_req_finished"))
    .map((msg) => {
      if (msg.type === "say" && msg.say === "api_req_started") {
        const combinedRequest = combinedApiRequests.find((req) => req.ts === msg.ts);
        return combinedRequest || msg;
      }
      return msg;
    });
}
