@cf/moonshotai/kimi-k2.5
Kimi K2.5 is a frontier-scale open-source model with a 256k context window, multi-turn tool calling, vision inputs, and structured outputs for agentic workloads.

Model Info	
Context Window ↗	256,000 tokens
Function calling ↗	Yes
Reasoning	Yes
Vision	Yes
Batch	Yes
Unit Pricing	$0.60 per M input tokens, $0.10 per M cached input tokens, $3.00 per M output tokens
Prompt caching

For optimal performance with multi-turn conversations, send the x-session-affinity header with a unique session identifier to enable prompt caching. This routes requests to the same model instance, reducing latency and inference costs. For details, refer to Prompt caching.

Playground
Try out this model with Workers AI LLM Playground. It does not require any setup or authentication and an instant way to preview and test a model directly in the browser.

Launch the LLM Playground
Usage
Worker (Streaming)
TypeScript
Python
curl
TypeScript
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request, env): Promise<Response> {

    const messages = [
      { role: "system", content: "You are a friendly assistant" },
      {
        role: "user",
        content: "What is the origin of the phrase Hello, World",
      },
    ];

    const stream = await env.AI.run("@cf/moonshotai/kimi-k2.5", {
      messages,
      stream: true,
    });

    return new Response(stream, {
      headers: { "content-type": "text/event-stream" },
    });
  },
} satisfies ExportedHandler<Env>;

OpenAI compatible endpoints

Workers AI also supports OpenAI compatible API endpoints for /v1/chat/completions and /v1/embeddings. For more details, refer to Configurations .
Parameters
* indicates a required field

Input
0 one of
0 object
prompt string required min 1
The input text prompt for the model to generate a response.

model string
ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc').

audio object
Parameters for audio output. Required when modalities includes 'audio'.

voice one of required
0 string
1 object
id string required
format string required
frequency_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on their existing frequency in the text so far.

1 null 0
Penalizes new tokens based on their existing frequency in the text so far.

logit_bias
0 object
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

1 null
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

logprobs
0 boolean
Whether to return log probabilities of the output tokens.

1 null
Whether to return log probabilities of the output tokens.

top_logprobs
0 integer min 0 max 20
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

1 null
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

max_tokens
0 integer
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

1 null
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

max_completion_tokens
0 integer
An upper bound for the number of tokens that can be generated for a completion.

1 null
An upper bound for the number of tokens that can be generated for a completion.

metadata
0 object
Set of 16 key-value pairs that can be attached to the object.

1 null
Set of 16 key-value pairs that can be attached to the object.

modalities
0 array
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

items string
1 null
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

n
0 integer default 1 min 1 max 128
How many chat completion choices to generate for each input message.

1 null default 1
How many chat completion choices to generate for each input message.

parallel_tool_calls boolean default true
Whether to enable parallel function calling during tool use.

prediction object
type string required
content required
0 string
1 array
items object
type string required
text string required
presence_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on whether they appear in the text so far.

1 null 0
Penalizes new tokens based on whether they appear in the text so far.

reasoning_effort
0 string
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

1 null
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

chat_template_kwargs object
enable_thinking boolean default true
Whether to enable reasoning, enabled by default.

clear_thinking boolean
If false, preserves reasoning context between turns.

response_format one of
Specifies the format the model must output.

0 object
type string required
1 object
type string required
2 object
type string required
json_schema object required
name string required
description string
schema object
strict
0 boolean
1 null
seed
0 integer
If specified, the system will make a best effort to sample deterministically.

1 null
If specified, the system will make a best effort to sample deterministically.

service_tier
0 string default auto
Specifies the processing type used for serving the request.

1 null default auto
Specifies the processing type used for serving the request.

stop
0 null
Up to 4 sequences where the API will stop generating further tokens.

1 string
Up to 4 sequences where the API will stop generating further tokens.

2 array
Up to 4 sequences where the API will stop generating further tokens.

items string
store
0 boolean
Whether to store the output for model distillation / evals.

1 null
Whether to store the output for model distillation / evals.

stream
0 boolean
If true, partial message deltas will be sent as server-sent events.

1 null
If true, partial message deltas will be sent as server-sent events.

stream_options object
include_usage boolean
include_obfuscation boolean
temperature
0 number default 1 min 0 max 2
Sampling temperature between 0 and 2.

1 null default 1
Sampling temperature between 0 and 2.

tool_choice one of
Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.

0 string
1 object
Force a specific function tool.

type string required
function object required
name string required
2 object
Force a specific custom tool.

type string required
custom object required
name string required
3 object
Constrain to an allowed subset of tools.

type string required
allowed_tools object required
mode string required
tools array required
items object
tools array
A list of tools the model may call.

items one of
0 object
type string required
function object required
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

1 object
type string required
custom object required
name string required
description string
format one of
0 object
type string required
1 object
type string required
grammar object required
definition string required
syntax string required
top_p
0 number default 1 min 0 max 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

1 null default 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

user string
A unique identifier representing your end-user, for abuse monitoring.

web_search_options object
Options for the web search tool (when using built-in web search).

search_context_size string default medium
user_location object
type string required
approximate object required
city string
country string
region string
timezone string
function_call
0 string
1 object
name string required
functions array
items object
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

1 object
messages array required
A list of messages comprising the conversation so far.

items one of
0 object
role string required
content required
0 string
1 array
items object
type string required
text string required
name string
1 object
role string required
content required
0 string
1 array
items object
type string required
text string required
name string
2 object
role string required
content required
0 string
1 array
items object
type string required
text string
image_url object
url string
detail string default auto
input_audio object
data string
format string
file object
file_data string
file_id string
filename string
name string
3 object
role string required
content
0 string
1 null
2 array
items object
type string required
text string
refusal string
refusal
0 string
1 null
name string
audio object
id string required
tool_calls array
items one of
0 object
id string required
type string required
function object required
name string required
arguments string required
JSON-encoded arguments string.

1 object
id string required
type string required
custom object required
name string required
input string required
function_call object
name string required
arguments string required
4 object
role string required
content required
0 string
1 array
items object
type string required
text string required
tool_call_id string required
5 object
role string required
content string required
name string required
model string
ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc').

audio object
Parameters for audio output. Required when modalities includes 'audio'.

voice one of required
0 string
1 object
id string required
format string required
frequency_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on their existing frequency in the text so far.

1 null 0
Penalizes new tokens based on their existing frequency in the text so far.

logit_bias
0 object
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

1 null
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

logprobs
0 boolean
Whether to return log probabilities of the output tokens.

1 null
Whether to return log probabilities of the output tokens.

top_logprobs
0 integer min 0 max 20
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

1 null
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

max_tokens
0 integer
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

1 null
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

max_completion_tokens
0 integer
An upper bound for the number of tokens that can be generated for a completion.

1 null
An upper bound for the number of tokens that can be generated for a completion.

metadata
0 object
Set of 16 key-value pairs that can be attached to the object.

1 null
Set of 16 key-value pairs that can be attached to the object.

modalities
0 array
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

items string
1 null
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

n
0 integer default 1 min 1 max 128
How many chat completion choices to generate for each input message.

1 null default 1
How many chat completion choices to generate for each input message.

parallel_tool_calls boolean default true
Whether to enable parallel function calling during tool use.

prediction object
type string required
content required
0 string
1 array
items object
type string required
text string required
presence_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on whether they appear in the text so far.

1 null 0
Penalizes new tokens based on whether they appear in the text so far.

reasoning_effort
0 string
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

1 null
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

chat_template_kwargs object
enable_thinking boolean default true
Whether to enable reasoning, enabled by default.

clear_thinking boolean
If false, preserves reasoning context between turns.

response_format one of
Specifies the format the model must output.

0 object
type string required
1 object
type string required
2 object
type string required
json_schema object required
name string required
description string
schema object
strict
0 boolean
1 null
seed
0 integer
If specified, the system will make a best effort to sample deterministically.

1 null
If specified, the system will make a best effort to sample deterministically.

service_tier
0 string default auto
Specifies the processing type used for serving the request.

1 null default auto
Specifies the processing type used for serving the request.

stop
0 null
Up to 4 sequences where the API will stop generating further tokens.

1 string
Up to 4 sequences where the API will stop generating further tokens.

2 array
Up to 4 sequences where the API will stop generating further tokens.

items string
store
0 boolean
Whether to store the output for model distillation / evals.

1 null
Whether to store the output for model distillation / evals.

stream
0 boolean
If true, partial message deltas will be sent as server-sent events.

1 null
If true, partial message deltas will be sent as server-sent events.

stream_options object
include_usage boolean
include_obfuscation boolean
temperature
0 number default 1 min 0 max 2
Sampling temperature between 0 and 2.

1 null default 1
Sampling temperature between 0 and 2.

tool_choice one of
Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.

0 string
1 object
Force a specific function tool.

type string required
function object required
name string required
2 object
Force a specific custom tool.

type string required
custom object required
name string required
3 object
Constrain to an allowed subset of tools.

type string required
allowed_tools object required
mode string required
tools array required
items object
tools array
A list of tools the model may call.

items one of
0 object
type string required
function object required
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

1 object
type string required
custom object required
name string required
description string
format one of
0 object
type string required
1 object
type string required
grammar object required
definition string required
syntax string required
top_p
0 number default 1 min 0 max 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

1 null default 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

user string
A unique identifier representing your end-user, for abuse monitoring.

web_search_options object
Options for the web search tool (when using built-in web search).

search_context_size string default medium
user_location object
type string required
approximate object required
city string
country string
region string
timezone string
function_call
0 string
1 object
name string required
functions array
items object
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

1 object
requests array
items one of
0 object
prompt string required min 1
The input text prompt for the model to generate a response.

model string
ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc').

audio object
Parameters for audio output. Required when modalities includes 'audio'.

voice one of required
0 string
1 object
id string required
format string required
frequency_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on their existing frequency in the text so far.

1 null 0
Penalizes new tokens based on their existing frequency in the text so far.

logit_bias
0 object
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

1 null
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

logprobs
0 boolean
Whether to return log probabilities of the output tokens.

1 null
Whether to return log probabilities of the output tokens.

top_logprobs
0 integer min 0 max 20
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

1 null
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

max_tokens
0 integer
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

1 null
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

max_completion_tokens
0 integer
An upper bound for the number of tokens that can be generated for a completion.

1 null
An upper bound for the number of tokens that can be generated for a completion.

metadata
0 object
Set of 16 key-value pairs that can be attached to the object.

1 null
Set of 16 key-value pairs that can be attached to the object.

modalities
0 array
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

items string
1 null
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

n
0 integer default 1 min 1 max 128
How many chat completion choices to generate for each input message.

1 null default 1
How many chat completion choices to generate for each input message.

parallel_tool_calls boolean default true
Whether to enable parallel function calling during tool use.

prediction object
type string required
content required
0 string
1 array
items object
type string required
text string required
presence_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on whether they appear in the text so far.

1 null 0
Penalizes new tokens based on whether they appear in the text so far.

reasoning_effort
0 string
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

1 null
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

chat_template_kwargs object
enable_thinking boolean default true
Whether to enable reasoning, enabled by default.

clear_thinking boolean
If false, preserves reasoning context between turns.

response_format one of
Specifies the format the model must output.

0 object
type string required
1 object
type string required
2 object
type string required
json_schema object required
name string required
description string
schema object
strict
0 boolean
1 null
seed
0 integer
If specified, the system will make a best effort to sample deterministically.

1 null
If specified, the system will make a best effort to sample deterministically.

service_tier
0 string default auto
Specifies the processing type used for serving the request.

1 null default auto
Specifies the processing type used for serving the request.

stop
0 null
Up to 4 sequences where the API will stop generating further tokens.

1 string
Up to 4 sequences where the API will stop generating further tokens.

2 array
Up to 4 sequences where the API will stop generating further tokens.

items string
store
0 boolean
Whether to store the output for model distillation / evals.

1 null
Whether to store the output for model distillation / evals.

stream
0 boolean
If true, partial message deltas will be sent as server-sent events.

1 null
If true, partial message deltas will be sent as server-sent events.

stream_options object
include_usage boolean
include_obfuscation boolean
temperature
0 number default 1 min 0 max 2
Sampling temperature between 0 and 2.

1 null default 1
Sampling temperature between 0 and 2.

tool_choice one of
Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.

0 string
1 object
Force a specific function tool.

type string required
function object required
name string required
2 object
Force a specific custom tool.

type string required
custom object required
name string required
3 object
Constrain to an allowed subset of tools.

type string required
allowed_tools object required
mode string required
tools array required
items object
tools array
A list of tools the model may call.

items one of
0 object
type string required
function object required
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

1 object
type string required
custom object required
name string required
description string
format one of
0 object
type string required
1 object
type string required
grammar object required
definition string required
syntax string required
top_p
0 number default 1 min 0 max 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

1 null default 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

user string
A unique identifier representing your end-user, for abuse monitoring.

web_search_options object
Options for the web search tool (when using built-in web search).

search_context_size string default medium
user_location object
type string required
approximate object required
city string
country string
region string
timezone string
function_call
0 string
1 object
name string required
functions array
items object
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

1 object
messages array required
A list of messages comprising the conversation so far.

items one of
0 object
role string required
content required
0 string
1 array
items object
type string required
text string required
name string
1 object
role string required
content required
0 string
1 array
items object
type string required
text string required
name string
2 object
role string required
content required
0 string
1 array
items object
type string required
text string
image_url object
url string
detail string default auto
input_audio object
data string
format string
file object
file_data string
file_id string
filename string
name string
3 object
role string required
content
0 string
1 null
2 array
items object
type string required
text string
refusal string
refusal
0 string
1 null
name string
audio object
id string required
tool_calls array
items one of
0 object
id string required
type string required
function object required
name string required
arguments string required
JSON-encoded arguments string.

1 object
id string required
type string required
custom object required
name string required
input string required
function_call object
name string required
arguments string required
4 object
role string required
content required
0 string
1 array
items object
type string required
text string required
tool_call_id string required
5 object
role string required
content string required
name string required
model string
ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc').

audio object
Parameters for audio output. Required when modalities includes 'audio'.

voice one of required
0 string
1 object
id string required
format string required
frequency_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on their existing frequency in the text so far.

1 null 0
Penalizes new tokens based on their existing frequency in the text so far.

logit_bias
0 object
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

1 null
Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100.

logprobs
0 boolean
Whether to return log probabilities of the output tokens.

1 null
Whether to return log probabilities of the output tokens.

top_logprobs
0 integer min 0 max 20
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

1 null
How many top log probabilities to return at each token position (0-20). Requires logprobs=true.

max_tokens
0 integer
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

1 null
Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate.

max_completion_tokens
0 integer
An upper bound for the number of tokens that can be generated for a completion.

1 null
An upper bound for the number of tokens that can be generated for a completion.

metadata
0 object
Set of 16 key-value pairs that can be attached to the object.

1 null
Set of 16 key-value pairs that can be attached to the object.

modalities
0 array
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

items string
1 null
Output types requested from the model (e.g. ['text'] or ['text', 'audio']).

n
0 integer default 1 min 1 max 128
How many chat completion choices to generate for each input message.

1 null default 1
How many chat completion choices to generate for each input message.

parallel_tool_calls boolean default true
Whether to enable parallel function calling during tool use.

prediction object
type string required
content required
0 string
1 array
items object
type string required
text string required
presence_penalty
0 number 0 min -2 max 2
Penalizes new tokens based on whether they appear in the text so far.

1 null 0
Penalizes new tokens based on whether they appear in the text so far.

reasoning_effort
0 string
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

1 null
Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.).

chat_template_kwargs object
enable_thinking boolean default true
Whether to enable reasoning, enabled by default.

clear_thinking boolean
If false, preserves reasoning context between turns.

response_format one of
Specifies the format the model must output.

0 object
type string required
1 object
type string required
2 object
type string required
json_schema object required
name string required
description string
schema object
strict
0 boolean
1 null
seed
0 integer
If specified, the system will make a best effort to sample deterministically.

1 null
If specified, the system will make a best effort to sample deterministically.

service_tier
0 string default auto
Specifies the processing type used for serving the request.

1 null default auto
Specifies the processing type used for serving the request.

stop
0 null
Up to 4 sequences where the API will stop generating further tokens.

1 string
Up to 4 sequences where the API will stop generating further tokens.

2 array
Up to 4 sequences where the API will stop generating further tokens.

items string
store
0 boolean
Whether to store the output for model distillation / evals.

1 null
Whether to store the output for model distillation / evals.

stream
0 boolean
If true, partial message deltas will be sent as server-sent events.

1 null
If true, partial message deltas will be sent as server-sent events.

stream_options object
include_usage boolean
include_obfuscation boolean
temperature
0 number default 1 min 0 max 2
Sampling temperature between 0 and 2.

1 null default 1
Sampling temperature between 0 and 2.

tool_choice one of
Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.

0 string
1 object
Force a specific function tool.

type string required
function object required
name string required
2 object
Force a specific custom tool.

type string required
custom object required
name string required
3 object
Constrain to an allowed subset of tools.

type string required
allowed_tools object required
mode string required
tools array required
items object
tools array
A list of tools the model may call.

items one of
0 object
type string required
function object required
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

1 object
type string required
custom object required
name string required
description string
format one of
0 object
type string required
1 object
type string required
grammar object required
definition string required
syntax string required
top_p
0 number default 1 min 0 max 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

1 null default 1
Nucleus sampling: considers the results of the tokens with top_p probability mass.

user string
A unique identifier representing your end-user, for abuse monitoring.

web_search_options object
Options for the web search tool (when using built-in web search).

search_context_size string default medium
user_location object
type string required
approximate object required
city string
country string
region string
timezone string
function_call
0 string
1 object
name string required
functions array
items object
name string required
The name of the function to be called.

description string
A description of what the function does.

parameters object
The parameters the function accepts, described as a JSON Schema object.

strict
0 boolean
Whether to enable strict schema adherence.

1 null
Whether to enable strict schema adherence.

Output
0 object
id string required
A unique identifier for the chat completion.

object string required
created integer required
Unix timestamp (seconds) of when the completion was created.

model string required
The model used for the chat completion.

choices array required
items object
index integer required
message object required
role string required
content required
0 string
1 null
refusal required
0 string
1 null
annotations array
items object
type string required
url_citation object required
url string required
title string required
start_index integer required
end_index integer required
audio object
id string required
data string required
Base64 encoded audio bytes.

expires_at integer required
transcript string required
tool_calls array
items one of
0 object
id string required
type string required
function object required
name string required
arguments string required
JSON-encoded arguments string.

1 object
id string required
type string required
custom object required
name string required
input string required
function_call
0 object
name string required
arguments string required
1 null
finish_reason string required
logprobs required
0 object
content
0 array
items object
token string required
logprob number required
bytes required
0 array
items integer
1 null
top_logprobs array required
items object
token string required
logprob number required
bytes required
0 array
items integer
1 null
1 null
refusal
0 array
items object
token string required
logprob number required
bytes required
0 array
items integer
1 null
top_logprobs array required
items object
token string required
logprob number required
bytes required
0 array
items integer
1 null
1 null
1 null
usage object
prompt_tokens integer required
completion_tokens integer required
total_tokens integer required
prompt_tokens_details object
cached_tokens integer
audio_tokens integer
completion_tokens_details object
reasoning_tokens integer
audio_tokens integer
accepted_prediction_tokens integer
rejected_prediction_tokens integer
system_fingerprint
0 string
1 null
service_tier
0 string
1 null
1 string
API Schemas
The following schemas are based on JSON Schema

Input
Output
{
    "anyOf": [
        {
            "type": "object",
            "oneOf": [
                {
                    "title": "Prompt",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "minLength": 1,
                            "description": "The input text prompt for the model to generate a response."
                        },
                        "model": {
                            "type": "string",
                            "description": "ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc')."
                        },
                        "audio": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "description": "Parameters for audio output. Required when modalities includes 'audio'.",
                                    "properties": {
                                        "voice": {
                                            "oneOf": [
                                                {
                                                    "type": "string"
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "id": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "id"
                                                    ]
                                                }
                                            ]
                                        },
                                        "format": {
                                            "type": "string",
                                            "enum": [
                                                "wav",
                                                "aac",
                                                "mp3",
                                                "flac",
                                                "opus",
                                                "pcm16"
                                            ]
                                        }
                                    },
                                    "required": [
                                        "voice",
                                        "format"
                                    ]
                                }
                            ]
                        },
                        "frequency_penalty": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": -2,
                                    "maximum": 2
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 0,
                            "description": "Penalizes new tokens based on their existing frequency in the text so far."
                        },
                        "logit_bias": {
                            "anyOf": [
                                {
                                    "type": "object"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100."
                        },
                        "logprobs": {
                            "anyOf": [
                                {
                                    "type": "boolean"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": false,
                            "description": "Whether to return log probabilities of the output tokens."
                        },
                        "top_logprobs": {
                            "anyOf": [
                                {
                                    "type": "integer",
                                    "minimum": 0,
                                    "maximum": 20
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "How many top log probabilities to return at each token position (0-20). Requires logprobs=true."
                        },
                        "max_tokens": {
                            "anyOf": [
                                {
                                    "type": "integer"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate."
                        },
                        "max_completion_tokens": {
                            "anyOf": [
                                {
                                    "type": "integer"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "An upper bound for the number of tokens that can be generated for a completion."
                        },
                        "metadata": {
                            "anyOf": [
                                {
                                    "type": "object"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Set of 16 key-value pairs that can be attached to the object."
                        },
                        "modalities": {
                            "anyOf": [
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                        "enum": [
                                            "text",
                                            "audio"
                                        ]
                                    }
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Output types requested from the model (e.g. ['text'] or ['text', 'audio'])."
                        },
                        "n": {
                            "anyOf": [
                                {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 128
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 1,
                            "description": "How many chat completion choices to generate for each input message."
                        },
                        "parallel_tool_calls": {
                            "type": "boolean",
                            "default": true,
                            "description": "Whether to enable parallel function calling during tool use."
                        },
                        "prediction": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "enum": [
                                                "content"
                                            ]
                                        },
                                        "content": {
                                            "anyOf": [
                                                {
                                                    "type": "string"
                                                },
                                                {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "text"
                                                                ]
                                                            },
                                                            "text": {
                                                                "type": "string"
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "text"
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    "required": [
                                        "type",
                                        "content"
                                    ]
                                }
                            ]
                        },
                        "presence_penalty": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": -2,
                                    "maximum": 2
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 0,
                            "description": "Penalizes new tokens based on whether they appear in the text so far."
                        },
                        "reasoning_effort": {
                            "anyOf": [
                                {
                                    "type": "string",
                                    "enum": [
                                        "low",
                                        "medium",
                                        "high"
                                    ]
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.)."
                        },
                        "chat_template_kwargs": {
                            "type": "object",
                            "properties": {
                                "enable_thinking": {
                                    "type": "boolean",
                                    "default": true,
                                    "description": "Whether to enable reasoning, enabled by default."
                                },
                                "clear_thinking": {
                                    "type": "boolean",
                                    "default": false,
                                    "description": "If false, preserves reasoning context between turns."
                                }
                            }
                        },
                        "response_format": {
                            "anyOf": [
                                {
                                    "description": "Specifies the format the model must output.",
                                    "oneOf": [
                                        {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "text"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "json_object"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "json_schema"
                                                    ]
                                                },
                                                "json_schema": {
                                                    "type": "object",
                                                    "properties": {
                                                        "name": {
                                                            "type": "string"
                                                        },
                                                        "description": {
                                                            "type": "string"
                                                        },
                                                        "schema": {
                                                            "type": "object"
                                                        },
                                                        "strict": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "boolean"
                                                                },
                                                                {
                                                                    "type": "null"
                                                                }
                                                            ]
                                                        }
                                                    },
                                                    "required": [
                                                        "name"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "json_schema"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        "seed": {
                            "anyOf": [
                                {
                                    "type": "integer"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "If specified, the system will make a best effort to sample deterministically."
                        },
                        "service_tier": {
                            "anyOf": [
                                {
                                    "type": "string",
                                    "enum": [
                                        "auto",
                                        "default",
                                        "flex",
                                        "scale",
                                        "priority"
                                    ]
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": "auto",
                            "description": "Specifies the processing type used for serving the request."
                        },
                        "stop": {
                            "description": "Up to 4 sequences where the API will stop generating further tokens.",
                            "anyOf": [
                                {
                                    "type": "null"
                                },
                                {
                                    "type": "string"
                                },
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    },
                                    "minItems": 1,
                                    "maxItems": 4
                                }
                            ]
                        },
                        "store": {
                            "anyOf": [
                                {
                                    "type": "boolean"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": false,
                            "description": "Whether to store the output for model distillation / evals."
                        },
                        "stream": {
                            "anyOf": [
                                {
                                    "type": "boolean"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": false,
                            "description": "If true, partial message deltas will be sent as server-sent events."
                        },
                        "stream_options": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "properties": {
                                        "include_usage": {
                                            "type": "boolean"
                                        },
                                        "include_obfuscation": {
                                            "type": "boolean"
                                        }
                                    }
                                }
                            ]
                        },
                        "temperature": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 2
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 1,
                            "description": "Sampling temperature between 0 and 2."
                        },
                        "tool_choice": {
                            "anyOf": [
                                {
                                    "description": "Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.",
                                    "oneOf": [
                                        {
                                            "type": "string",
                                            "enum": [
                                                "none",
                                                "auto",
                                                "required"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "description": "Force a specific function tool.",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "function"
                                                    ]
                                                },
                                                "function": {
                                                    "type": "object",
                                                    "properties": {
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "name"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "function"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "description": "Force a specific custom tool.",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "custom"
                                                    ]
                                                },
                                                "custom": {
                                                    "type": "object",
                                                    "properties": {
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "name"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "custom"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "description": "Constrain to an allowed subset of tools.",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "allowed_tools"
                                                    ]
                                                },
                                                "allowed_tools": {
                                                    "type": "object",
                                                    "properties": {
                                                        "mode": {
                                                            "type": "string",
                                                            "enum": [
                                                                "auto",
                                                                "required"
                                                            ]
                                                        },
                                                        "tools": {
                                                            "type": "array",
                                                            "items": {
                                                                "type": "object"
                                                            }
                                                        }
                                                    },
                                                    "required": [
                                                        "mode",
                                                        "tools"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "allowed_tools"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        "tools": {
                            "type": "array",
                            "description": "A list of tools the model may call.",
                            "items": {
                                "oneOf": [
                                    {
                                        "type": "object",
                                        "properties": {
                                            "type": {
                                                "type": "string",
                                                "enum": [
                                                    "function"
                                                ]
                                            },
                                            "function": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string",
                                                        "description": "The name of the function to be called."
                                                    },
                                                    "description": {
                                                        "type": "string",
                                                        "description": "A description of what the function does."
                                                    },
                                                    "parameters": {
                                                        "type": "object",
                                                        "description": "The parameters the function accepts, described as a JSON Schema object."
                                                    },
                                                    "strict": {
                                                        "anyOf": [
                                                            {
                                                                "type": "boolean"
                                                            },
                                                            {
                                                                "type": "null"
                                                            }
                                                        ],
                                                        "default": false,
                                                        "description": "Whether to enable strict schema adherence."
                                                    }
                                                },
                                                "required": [
                                                    "name"
                                                ]
                                            }
                                        },
                                        "required": [
                                            "type",
                                            "function"
                                        ]
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "type": {
                                                "type": "string",
                                                "enum": [
                                                    "custom"
                                                ]
                                            },
                                            "custom": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string"
                                                    },
                                                    "description": {
                                                        "type": "string"
                                                    },
                                                    "format": {
                                                        "oneOf": [
                                                            {
                                                                "type": "object",
                                                                "properties": {
                                                                    "type": {
                                                                        "type": "string",
                                                                        "enum": [
                                                                            "text"
                                                                        ]
                                                                    }
                                                                },
                                                                "required": [
                                                                    "type"
                                                                ]
                                                            },
                                                            {
                                                                "type": "object",
                                                                "properties": {
                                                                    "type": {
                                                                        "type": "string",
                                                                        "enum": [
                                                                            "grammar"
                                                                        ]
                                                                    },
                                                                    "grammar": {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "definition": {
                                                                                "type": "string"
                                                                            },
                                                                            "syntax": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "lark",
                                                                                    "regex"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "definition",
                                                                            "syntax"
                                                                        ]
                                                                    }
                                                                },
                                                                "required": [
                                                                    "type",
                                                                    "grammar"
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                },
                                                "required": [
                                                    "name"
                                                ]
                                            }
                                        },
                                        "required": [
                                            "type",
                                            "custom"
                                        ]
                                    }
                                ]
                            }
                        },
                        "top_p": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 1
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 1,
                            "description": "Nucleus sampling: considers the results of the tokens with top_p probability mass."
                        },
                        "user": {
                            "type": "string",
                            "description": "A unique identifier representing your end-user, for abuse monitoring."
                        },
                        "web_search_options": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "description": "Options for the web search tool (when using built-in web search).",
                                    "properties": {
                                        "search_context_size": {
                                            "type": "string",
                                            "enum": [
                                                "low",
                                                "medium",
                                                "high"
                                            ],
                                            "default": "medium"
                                        },
                                        "user_location": {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "approximate"
                                                    ]
                                                },
                                                "approximate": {
                                                    "type": "object",
                                                    "properties": {
                                                        "city": {
                                                            "type": "string"
                                                        },
                                                        "country": {
                                                            "type": "string"
                                                        },
                                                        "region": {
                                                            "type": "string"
                                                        },
                                                        "timezone": {
                                                            "type": "string"
                                                        }
                                                    }
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "approximate"
                                            ]
                                        }
                                    }
                                }
                            ]
                        },
                        "function_call": {
                            "anyOf": [
                                {
                                    "type": "string",
                                    "enum": [
                                        "none",
                                        "auto"
                                    ]
                                },
                                {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "name"
                                    ]
                                }
                            ]
                        },
                        "functions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "The name of the function to be called."
                                    },
                                    "description": {
                                        "type": "string",
                                        "description": "A description of what the function does."
                                    },
                                    "parameters": {
                                        "type": "object",
                                        "description": "The parameters the function accepts, described as a JSON Schema object."
                                    },
                                    "strict": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "Whether to enable strict schema adherence."
                                    }
                                },
                                "required": [
                                    "name"
                                ]
                            },
                            "minItems": 1,
                            "maxItems": 128
                        }
                    },
                    "required": [
                        "prompt"
                    ]
                },
                {
                    "title": "Messages",
                    "properties": {
                        "messages": {
                            "type": "array",
                            "description": "A list of messages comprising the conversation so far.",
                            "items": {
                                "oneOf": [
                                    {
                                        "type": "object",
                                        "properties": {
                                            "role": {
                                                "type": "string",
                                                "enum": [
                                                    "developer"
                                                ]
                                            },
                                            "content": {
                                                "anyOf": [
                                                    {
                                                        "type": "string"
                                                    },
                                                    {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "properties": {
                                                                "type": {
                                                                    "type": "string",
                                                                    "enum": [
                                                                        "text"
                                                                    ]
                                                                },
                                                                "text": {
                                                                    "type": "string"
                                                                }
                                                            },
                                                            "required": [
                                                                "type",
                                                                "text"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            },
                                            "name": {
                                                "type": "string"
                                            }
                                        },
                                        "required": [
                                            "role",
                                            "content"
                                        ]
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "role": {
                                                "type": "string",
                                                "enum": [
                                                    "system"
                                                ]
                                            },
                                            "content": {
                                                "anyOf": [
                                                    {
                                                        "type": "string"
                                                    },
                                                    {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "properties": {
                                                                "type": {
                                                                    "type": "string",
                                                                    "enum": [
                                                                        "text"
                                                                    ]
                                                                },
                                                                "text": {
                                                                    "type": "string"
                                                                }
                                                            },
                                                            "required": [
                                                                "type",
                                                                "text"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            },
                                            "name": {
                                                "type": "string"
                                            }
                                        },
                                        "required": [
                                            "role",
                                            "content"
                                        ]
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "role": {
                                                "type": "string",
                                                "enum": [
                                                    "user"
                                                ]
                                            },
                                            "content": {
                                                "anyOf": [
                                                    {
                                                        "type": "string"
                                                    },
                                                    {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "properties": {
                                                                "type": {
                                                                    "type": "string",
                                                                    "enum": [
                                                                        "text",
                                                                        "image_url",
                                                                        "input_audio",
                                                                        "file"
                                                                    ]
                                                                },
                                                                "text": {
                                                                    "type": "string"
                                                                },
                                                                "image_url": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "url": {
                                                                            "type": "string"
                                                                        },
                                                                        "detail": {
                                                                            "type": "string",
                                                                            "enum": [
                                                                                "auto",
                                                                                "low",
                                                                                "high"
                                                                            ],
                                                                            "default": "auto"
                                                                        }
                                                                    }
                                                                },
                                                                "input_audio": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "data": {
                                                                            "type": "string"
                                                                        },
                                                                        "format": {
                                                                            "type": "string",
                                                                            "enum": [
                                                                                "wav",
                                                                                "mp3"
                                                                            ]
                                                                        }
                                                                    }
                                                                },
                                                                "file": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "file_data": {
                                                                            "type": "string"
                                                                        },
                                                                        "file_id": {
                                                                            "type": "string"
                                                                        },
                                                                        "filename": {
                                                                            "type": "string"
                                                                        }
                                                                    }
                                                                }
                                                            },
                                                            "required": [
                                                                "type"
                                                            ]
                                                        },
                                                        "minItems": 1
                                                    }
                                                ]
                                            },
                                            "name": {
                                                "type": "string"
                                            }
                                        },
                                        "required": [
                                            "role",
                                            "content"
                                        ]
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "role": {
                                                "type": "string",
                                                "enum": [
                                                    "assistant"
                                                ]
                                            },
                                            "content": {
                                                "anyOf": [
                                                    {
                                                        "type": "string"
                                                    },
                                                    {
                                                        "type": "null"
                                                    },
                                                    {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "properties": {
                                                                "type": {
                                                                    "type": "string",
                                                                    "enum": [
                                                                        "text",
                                                                        "refusal"
                                                                    ]
                                                                },
                                                                "text": {
                                                                    "type": "string"
                                                                },
                                                                "refusal": {
                                                                    "type": "string"
                                                                }
                                                            },
                                                            "required": [
                                                                "type"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            },
                                            "refusal": {
                                                "anyOf": [
                                                    {
                                                        "type": "string"
                                                    },
                                                    {
                                                        "type": "null"
                                                    }
                                                ]
                                            },
                                            "name": {
                                                "type": "string"
                                            },
                                            "audio": {
                                                "anyOf": [
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "id": {
                                                                "type": "string"
                                                            }
                                                        },
                                                        "required": [
                                                            "id"
                                                        ]
                                                    }
                                                ]
                                            },
                                            "tool_calls": {
                                                "type": "array",
                                                "items": {
                                                    "oneOf": [
                                                        {
                                                            "type": "object",
                                                            "properties": {
                                                                "id": {
                                                                    "type": "string"
                                                                },
                                                                "type": {
                                                                    "type": "string",
                                                                    "enum": [
                                                                        "function"
                                                                    ]
                                                                },
                                                                "function": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "name": {
                                                                            "type": "string"
                                                                        },
                                                                        "arguments": {
                                                                            "type": "string",
                                                                            "description": "JSON-encoded arguments string."
                                                                        }
                                                                    },
                                                                    "required": [
                                                                        "name",
                                                                        "arguments"
                                                                    ]
                                                                }
                                                            },
                                                            "required": [
                                                                "id",
                                                                "type",
                                                                "function"
                                                            ]
                                                        },
                                                        {
                                                            "type": "object",
                                                            "properties": {
                                                                "id": {
                                                                    "type": "string"
                                                                },
                                                                "type": {
                                                                    "type": "string",
                                                                    "enum": [
                                                                        "custom"
                                                                    ]
                                                                },
                                                                "custom": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "name": {
                                                                            "type": "string"
                                                                        },
                                                                        "input": {
                                                                            "type": "string"
                                                                        }
                                                                    },
                                                                    "required": [
                                                                        "name",
                                                                        "input"
                                                                    ]
                                                                }
                                                            },
                                                            "required": [
                                                                "id",
                                                                "type",
                                                                "custom"
                                                            ]
                                                        }
                                                    ]
                                                }
                                            },
                                            "function_call": {
                                                "anyOf": [
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "name": {
                                                                "type": "string"
                                                            },
                                                            "arguments": {
                                                                "type": "string"
                                                            }
                                                        },
                                                        "required": [
                                                            "name",
                                                            "arguments"
                                                        ]
                                                    }
                                                ]
                                            }
                                        },
                                        "required": [
                                            "role"
                                        ]
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "role": {
                                                "type": "string",
                                                "enum": [
                                                    "tool"
                                                ]
                                            },
                                            "content": {
                                                "anyOf": [
                                                    {
                                                        "type": "string"
                                                    },
                                                    {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "properties": {
                                                                "type": {
                                                                    "type": "string",
                                                                    "enum": [
                                                                        "text"
                                                                    ]
                                                                },
                                                                "text": {
                                                                    "type": "string"
                                                                }
                                                            },
                                                            "required": [
                                                                "type",
                                                                "text"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            },
                                            "tool_call_id": {
                                                "type": "string"
                                            }
                                        },
                                        "required": [
                                            "role",
                                            "content",
                                            "tool_call_id"
                                        ]
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "role": {
                                                "type": "string",
                                                "enum": [
                                                    "function"
                                                ]
                                            },
                                            "content": {
                                                "type": "string"
                                            },
                                            "name": {
                                                "type": "string"
                                            }
                                        },
                                        "required": [
                                            "role",
                                            "content",
                                            "name"
                                        ]
                                    }
                                ]
                            },
                            "minItems": 1
                        },
                        "model": {
                            "type": "string",
                            "description": "ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc')."
                        },
                        "audio": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "description": "Parameters for audio output. Required when modalities includes 'audio'.",
                                    "properties": {
                                        "voice": {
                                            "oneOf": [
                                                {
                                                    "type": "string"
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "id": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "id"
                                                    ]
                                                }
                                            ]
                                        },
                                        "format": {
                                            "type": "string",
                                            "enum": [
                                                "wav",
                                                "aac",
                                                "mp3",
                                                "flac",
                                                "opus",
                                                "pcm16"
                                            ]
                                        }
                                    },
                                    "required": [
                                        "voice",
                                        "format"
                                    ]
                                }
                            ]
                        },
                        "frequency_penalty": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": -2,
                                    "maximum": 2
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 0,
                            "description": "Penalizes new tokens based on their existing frequency in the text so far."
                        },
                        "logit_bias": {
                            "anyOf": [
                                {
                                    "type": "object"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100."
                        },
                        "logprobs": {
                            "anyOf": [
                                {
                                    "type": "boolean"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": false,
                            "description": "Whether to return log probabilities of the output tokens."
                        },
                        "top_logprobs": {
                            "anyOf": [
                                {
                                    "type": "integer",
                                    "minimum": 0,
                                    "maximum": 20
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "How many top log probabilities to return at each token position (0-20). Requires logprobs=true."
                        },
                        "max_tokens": {
                            "anyOf": [
                                {
                                    "type": "integer"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate."
                        },
                        "max_completion_tokens": {
                            "anyOf": [
                                {
                                    "type": "integer"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "An upper bound for the number of tokens that can be generated for a completion."
                        },
                        "metadata": {
                            "anyOf": [
                                {
                                    "type": "object"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Set of 16 key-value pairs that can be attached to the object."
                        },
                        "modalities": {
                            "anyOf": [
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                        "enum": [
                                            "text",
                                            "audio"
                                        ]
                                    }
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Output types requested from the model (e.g. ['text'] or ['text', 'audio'])."
                        },
                        "n": {
                            "anyOf": [
                                {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 128
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 1,
                            "description": "How many chat completion choices to generate for each input message."
                        },
                        "parallel_tool_calls": {
                            "type": "boolean",
                            "default": true,
                            "description": "Whether to enable parallel function calling during tool use."
                        },
                        "prediction": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "enum": [
                                                "content"
                                            ]
                                        },
                                        "content": {
                                            "anyOf": [
                                                {
                                                    "type": "string"
                                                },
                                                {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "text"
                                                                ]
                                                            },
                                                            "text": {
                                                                "type": "string"
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "text"
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    "required": [
                                        "type",
                                        "content"
                                    ]
                                }
                            ]
                        },
                        "presence_penalty": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": -2,
                                    "maximum": 2
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 0,
                            "description": "Penalizes new tokens based on whether they appear in the text so far."
                        },
                        "reasoning_effort": {
                            "anyOf": [
                                {
                                    "type": "string",
                                    "enum": [
                                        "low",
                                        "medium",
                                        "high"
                                    ]
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.)."
                        },
                        "chat_template_kwargs": {
                            "type": "object",
                            "properties": {
                                "enable_thinking": {
                                    "type": "boolean",
                                    "default": true,
                                    "description": "Whether to enable reasoning, enabled by default."
                                },
                                "clear_thinking": {
                                    "type": "boolean",
                                    "default": false,
                                    "description": "If false, preserves reasoning context between turns."
                                }
                            }
                        },
                        "response_format": {
                            "anyOf": [
                                {
                                    "description": "Specifies the format the model must output.",
                                    "oneOf": [
                                        {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "text"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "json_object"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "json_schema"
                                                    ]
                                                },
                                                "json_schema": {
                                                    "type": "object",
                                                    "properties": {
                                                        "name": {
                                                            "type": "string"
                                                        },
                                                        "description": {
                                                            "type": "string"
                                                        },
                                                        "schema": {
                                                            "type": "object"
                                                        },
                                                        "strict": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "boolean"
                                                                },
                                                                {
                                                                    "type": "null"
                                                                }
                                                            ]
                                                        }
                                                    },
                                                    "required": [
                                                        "name"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "json_schema"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        "seed": {
                            "anyOf": [
                                {
                                    "type": "integer"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "description": "If specified, the system will make a best effort to sample deterministically."
                        },
                        "service_tier": {
                            "anyOf": [
                                {
                                    "type": "string",
                                    "enum": [
                                        "auto",
                                        "default",
                                        "flex",
                                        "scale",
                                        "priority"
                                    ]
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": "auto",
                            "description": "Specifies the processing type used for serving the request."
                        },
                        "stop": {
                            "description": "Up to 4 sequences where the API will stop generating further tokens.",
                            "anyOf": [
                                {
                                    "type": "null"
                                },
                                {
                                    "type": "string"
                                },
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    },
                                    "minItems": 1,
                                    "maxItems": 4
                                }
                            ]
                        },
                        "store": {
                            "anyOf": [
                                {
                                    "type": "boolean"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": false,
                            "description": "Whether to store the output for model distillation / evals."
                        },
                        "stream": {
                            "anyOf": [
                                {
                                    "type": "boolean"
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": false,
                            "description": "If true, partial message deltas will be sent as server-sent events."
                        },
                        "stream_options": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "properties": {
                                        "include_usage": {
                                            "type": "boolean"
                                        },
                                        "include_obfuscation": {
                                            "type": "boolean"
                                        }
                                    }
                                }
                            ]
                        },
                        "temperature": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 2
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 1,
                            "description": "Sampling temperature between 0 and 2."
                        },
                        "tool_choice": {
                            "anyOf": [
                                {
                                    "description": "Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.",
                                    "oneOf": [
                                        {
                                            "type": "string",
                                            "enum": [
                                                "none",
                                                "auto",
                                                "required"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "description": "Force a specific function tool.",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "function"
                                                    ]
                                                },
                                                "function": {
                                                    "type": "object",
                                                    "properties": {
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "name"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "function"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "description": "Force a specific custom tool.",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "custom"
                                                    ]
                                                },
                                                "custom": {
                                                    "type": "object",
                                                    "properties": {
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "name"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "custom"
                                            ]
                                        },
                                        {
                                            "type": "object",
                                            "description": "Constrain to an allowed subset of tools.",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "allowed_tools"
                                                    ]
                                                },
                                                "allowed_tools": {
                                                    "type": "object",
                                                    "properties": {
                                                        "mode": {
                                                            "type": "string",
                                                            "enum": [
                                                                "auto",
                                                                "required"
                                                            ]
                                                        },
                                                        "tools": {
                                                            "type": "array",
                                                            "items": {
                                                                "type": "object"
                                                            }
                                                        }
                                                    },
                                                    "required": [
                                                        "mode",
                                                        "tools"
                                                    ]
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "allowed_tools"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        "tools": {
                            "type": "array",
                            "description": "A list of tools the model may call.",
                            "items": {
                                "oneOf": [
                                    {
                                        "type": "object",
                                        "properties": {
                                            "type": {
                                                "type": "string",
                                                "enum": [
                                                    "function"
                                                ]
                                            },
                                            "function": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string",
                                                        "description": "The name of the function to be called."
                                                    },
                                                    "description": {
                                                        "type": "string",
                                                        "description": "A description of what the function does."
                                                    },
                                                    "parameters": {
                                                        "type": "object",
                                                        "description": "The parameters the function accepts, described as a JSON Schema object."
                                                    },
                                                    "strict": {
                                                        "anyOf": [
                                                            {
                                                                "type": "boolean"
                                                            },
                                                            {
                                                                "type": "null"
                                                            }
                                                        ],
                                                        "default": false,
                                                        "description": "Whether to enable strict schema adherence."
                                                    }
                                                },
                                                "required": [
                                                    "name"
                                                ]
                                            }
                                        },
                                        "required": [
                                            "type",
                                            "function"
                                        ]
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "type": {
                                                "type": "string",
                                                "enum": [
                                                    "custom"
                                                ]
                                            },
                                            "custom": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string"
                                                    },
                                                    "description": {
                                                        "type": "string"
                                                    },
                                                    "format": {
                                                        "oneOf": [
                                                            {
                                                                "type": "object",
                                                                "properties": {
                                                                    "type": {
                                                                        "type": "string",
                                                                        "enum": [
                                                                            "text"
                                                                        ]
                                                                    }
                                                                },
                                                                "required": [
                                                                    "type"
                                                                ]
                                                            },
                                                            {
                                                                "type": "object",
                                                                "properties": {
                                                                    "type": {
                                                                        "type": "string",
                                                                        "enum": [
                                                                            "grammar"
                                                                        ]
                                                                    },
                                                                    "grammar": {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "definition": {
                                                                                "type": "string"
                                                                            },
                                                                            "syntax": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "lark",
                                                                                    "regex"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "definition",
                                                                            "syntax"
                                                                        ]
                                                                    }
                                                                },
                                                                "required": [
                                                                    "type",
                                                                    "grammar"
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                },
                                                "required": [
                                                    "name"
                                                ]
                                            }
                                        },
                                        "required": [
                                            "type",
                                            "custom"
                                        ]
                                    }
                                ]
                            }
                        },
                        "top_p": {
                            "anyOf": [
                                {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 1
                                },
                                {
                                    "type": "null"
                                }
                            ],
                            "default": 1,
                            "description": "Nucleus sampling: considers the results of the tokens with top_p probability mass."
                        },
                        "user": {
                            "type": "string",
                            "description": "A unique identifier representing your end-user, for abuse monitoring."
                        },
                        "web_search_options": {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "description": "Options for the web search tool (when using built-in web search).",
                                    "properties": {
                                        "search_context_size": {
                                            "type": "string",
                                            "enum": [
                                                "low",
                                                "medium",
                                                "high"
                                            ],
                                            "default": "medium"
                                        },
                                        "user_location": {
                                            "type": "object",
                                            "properties": {
                                                "type": {
                                                    "type": "string",
                                                    "enum": [
                                                        "approximate"
                                                    ]
                                                },
                                                "approximate": {
                                                    "type": "object",
                                                    "properties": {
                                                        "city": {
                                                            "type": "string"
                                                        },
                                                        "country": {
                                                            "type": "string"
                                                        },
                                                        "region": {
                                                            "type": "string"
                                                        },
                                                        "timezone": {
                                                            "type": "string"
                                                        }
                                                    }
                                                }
                                            },
                                            "required": [
                                                "type",
                                                "approximate"
                                            ]
                                        }
                                    }
                                }
                            ]
                        },
                        "function_call": {
                            "anyOf": [
                                {
                                    "type": "string",
                                    "enum": [
                                        "none",
                                        "auto"
                                    ]
                                },
                                {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "name"
                                    ]
                                }
                            ]
                        },
                        "functions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "The name of the function to be called."
                                    },
                                    "description": {
                                        "type": "string",
                                        "description": "A description of what the function does."
                                    },
                                    "parameters": {
                                        "type": "object",
                                        "description": "The parameters the function accepts, described as a JSON Schema object."
                                    },
                                    "strict": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "Whether to enable strict schema adherence."
                                    }
                                },
                                "required": [
                                    "name"
                                ]
                            },
                            "minItems": 1,
                            "maxItems": 128
                        }
                    },
                    "required": [
                        "messages"
                    ]
                }
            ]
        },
        {
            "type": "object",
            "properties": {
                "requests": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "oneOf": [
                            {
                                "title": "Prompt",
                                "properties": {
                                    "prompt": {
                                        "type": "string",
                                        "minLength": 1,
                                        "description": "The input text prompt for the model to generate a response."
                                    },
                                    "model": {
                                        "type": "string",
                                        "description": "ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc')."
                                    },
                                    "audio": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "description": "Parameters for audio output. Required when modalities includes 'audio'.",
                                                "properties": {
                                                    "voice": {
                                                        "oneOf": [
                                                            {
                                                                "type": "string"
                                                            },
                                                            {
                                                                "type": "object",
                                                                "properties": {
                                                                    "id": {
                                                                        "type": "string"
                                                                    }
                                                                },
                                                                "required": [
                                                                    "id"
                                                                ]
                                                            }
                                                        ]
                                                    },
                                                    "format": {
                                                        "type": "string",
                                                        "enum": [
                                                            "wav",
                                                            "aac",
                                                            "mp3",
                                                            "flac",
                                                            "opus",
                                                            "pcm16"
                                                        ]
                                                    }
                                                },
                                                "required": [
                                                    "voice",
                                                    "format"
                                                ]
                                            }
                                        ]
                                    },
                                    "frequency_penalty": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": -2,
                                                "maximum": 2
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 0,
                                        "description": "Penalizes new tokens based on their existing frequency in the text so far."
                                    },
                                    "logit_bias": {
                                        "anyOf": [
                                            {
                                                "type": "object"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100."
                                    },
                                    "logprobs": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "Whether to return log probabilities of the output tokens."
                                    },
                                    "top_logprobs": {
                                        "anyOf": [
                                            {
                                                "type": "integer",
                                                "minimum": 0,
                                                "maximum": 20
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "How many top log probabilities to return at each token position (0-20). Requires logprobs=true."
                                    },
                                    "max_tokens": {
                                        "anyOf": [
                                            {
                                                "type": "integer"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate."
                                    },
                                    "max_completion_tokens": {
                                        "anyOf": [
                                            {
                                                "type": "integer"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "An upper bound for the number of tokens that can be generated for a completion."
                                    },
                                    "metadata": {
                                        "anyOf": [
                                            {
                                                "type": "object"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Set of 16 key-value pairs that can be attached to the object."
                                    },
                                    "modalities": {
                                        "anyOf": [
                                            {
                                                "type": "array",
                                                "items": {
                                                    "type": "string",
                                                    "enum": [
                                                        "text",
                                                        "audio"
                                                    ]
                                                }
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Output types requested from the model (e.g. ['text'] or ['text', 'audio'])."
                                    },
                                    "n": {
                                        "anyOf": [
                                            {
                                                "type": "integer",
                                                "minimum": 1,
                                                "maximum": 128
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 1,
                                        "description": "How many chat completion choices to generate for each input message."
                                    },
                                    "parallel_tool_calls": {
                                        "type": "boolean",
                                        "default": true,
                                        "description": "Whether to enable parallel function calling during tool use."
                                    },
                                    "prediction": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "type": {
                                                        "type": "string",
                                                        "enum": [
                                                            "content"
                                                        ]
                                                    },
                                                    "content": {
                                                        "anyOf": [
                                                            {
                                                                "type": "string"
                                                            },
                                                            {
                                                                "type": "array",
                                                                "items": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "type": {
                                                                            "type": "string",
                                                                            "enum": [
                                                                                "text"
                                                                            ]
                                                                        },
                                                                        "text": {
                                                                            "type": "string"
                                                                        }
                                                                    },
                                                                    "required": [
                                                                        "type",
                                                                        "text"
                                                                    ]
                                                                }
                                                            }
                                                        ]
                                                    }
                                                },
                                                "required": [
                                                    "type",
                                                    "content"
                                                ]
                                            }
                                        ]
                                    },
                                    "presence_penalty": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": -2,
                                                "maximum": 2
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 0,
                                        "description": "Penalizes new tokens based on whether they appear in the text so far."
                                    },
                                    "reasoning_effort": {
                                        "anyOf": [
                                            {
                                                "type": "string",
                                                "enum": [
                                                    "low",
                                                    "medium",
                                                    "high"
                                                ]
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.)."
                                    },
                                    "chat_template_kwargs": {
                                        "type": "object",
                                        "properties": {
                                            "enable_thinking": {
                                                "type": "boolean",
                                                "default": true,
                                                "description": "Whether to enable reasoning, enabled by default."
                                            },
                                            "clear_thinking": {
                                                "type": "boolean",
                                                "default": false,
                                                "description": "If false, preserves reasoning context between turns."
                                            }
                                        }
                                    },
                                    "response_format": {
                                        "anyOf": [
                                            {
                                                "description": "Specifies the format the model must output.",
                                                "oneOf": [
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "text"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "json_object"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "json_schema"
                                                                ]
                                                            },
                                                            "json_schema": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "name": {
                                                                        "type": "string"
                                                                    },
                                                                    "description": {
                                                                        "type": "string"
                                                                    },
                                                                    "schema": {
                                                                        "type": "object"
                                                                    },
                                                                    "strict": {
                                                                        "anyOf": [
                                                                            {
                                                                                "type": "boolean"
                                                                            },
                                                                            {
                                                                                "type": "null"
                                                                            }
                                                                        ]
                                                                    }
                                                                },
                                                                "required": [
                                                                    "name"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "json_schema"
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    "seed": {
                                        "anyOf": [
                                            {
                                                "type": "integer"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "If specified, the system will make a best effort to sample deterministically."
                                    },
                                    "service_tier": {
                                        "anyOf": [
                                            {
                                                "type": "string",
                                                "enum": [
                                                    "auto",
                                                    "default",
                                                    "flex",
                                                    "scale",
                                                    "priority"
                                                ]
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": "auto",
                                        "description": "Specifies the processing type used for serving the request."
                                    },
                                    "stop": {
                                        "description": "Up to 4 sequences where the API will stop generating further tokens.",
                                        "anyOf": [
                                            {
                                                "type": "null"
                                            },
                                            {
                                                "type": "string"
                                            },
                                            {
                                                "type": "array",
                                                "items": {
                                                    "type": "string"
                                                },
                                                "minItems": 1,
                                                "maxItems": 4
                                            }
                                        ]
                                    },
                                    "store": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "Whether to store the output for model distillation / evals."
                                    },
                                    "stream": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "If true, partial message deltas will be sent as server-sent events."
                                    },
                                    "stream_options": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "include_usage": {
                                                        "type": "boolean"
                                                    },
                                                    "include_obfuscation": {
                                                        "type": "boolean"
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    "temperature": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": 0,
                                                "maximum": 2
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 1,
                                        "description": "Sampling temperature between 0 and 2."
                                    },
                                    "tool_choice": {
                                        "anyOf": [
                                            {
                                                "description": "Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.",
                                                "oneOf": [
                                                    {
                                                        "type": "string",
                                                        "enum": [
                                                            "none",
                                                            "auto",
                                                            "required"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "description": "Force a specific function tool.",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "function"
                                                                ]
                                                            },
                                                            "function": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "name": {
                                                                        "type": "string"
                                                                    }
                                                                },
                                                                "required": [
                                                                    "name"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "function"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "description": "Force a specific custom tool.",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "custom"
                                                                ]
                                                            },
                                                            "custom": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "name": {
                                                                        "type": "string"
                                                                    }
                                                                },
                                                                "required": [
                                                                    "name"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "custom"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "description": "Constrain to an allowed subset of tools.",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "allowed_tools"
                                                                ]
                                                            },
                                                            "allowed_tools": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "mode": {
                                                                        "type": "string",
                                                                        "enum": [
                                                                            "auto",
                                                                            "required"
                                                                        ]
                                                                    },
                                                                    "tools": {
                                                                        "type": "array",
                                                                        "items": {
                                                                            "type": "object"
                                                                        }
                                                                    }
                                                                },
                                                                "required": [
                                                                    "mode",
                                                                    "tools"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "allowed_tools"
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    "tools": {
                                        "type": "array",
                                        "description": "A list of tools the model may call.",
                                        "items": {
                                            "oneOf": [
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "type": {
                                                            "type": "string",
                                                            "enum": [
                                                                "function"
                                                            ]
                                                        },
                                                        "function": {
                                                            "type": "object",
                                                            "properties": {
                                                                "name": {
                                                                    "type": "string",
                                                                    "description": "The name of the function to be called."
                                                                },
                                                                "description": {
                                                                    "type": "string",
                                                                    "description": "A description of what the function does."
                                                                },
                                                                "parameters": {
                                                                    "type": "object",
                                                                    "description": "The parameters the function accepts, described as a JSON Schema object."
                                                                },
                                                                "strict": {
                                                                    "anyOf": [
                                                                        {
                                                                            "type": "boolean"
                                                                        },
                                                                        {
                                                                            "type": "null"
                                                                        }
                                                                    ],
                                                                    "default": false,
                                                                    "description": "Whether to enable strict schema adherence."
                                                                }
                                                            },
                                                            "required": [
                                                                "name"
                                                            ]
                                                        }
                                                    },
                                                    "required": [
                                                        "type",
                                                        "function"
                                                    ]
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "type": {
                                                            "type": "string",
                                                            "enum": [
                                                                "custom"
                                                            ]
                                                        },
                                                        "custom": {
                                                            "type": "object",
                                                            "properties": {
                                                                "name": {
                                                                    "type": "string"
                                                                },
                                                                "description": {
                                                                    "type": "string"
                                                                },
                                                                "format": {
                                                                    "oneOf": [
                                                                        {
                                                                            "type": "object",
                                                                            "properties": {
                                                                                "type": {
                                                                                    "type": "string",
                                                                                    "enum": [
                                                                                        "text"
                                                                                    ]
                                                                                }
                                                                            },
                                                                            "required": [
                                                                                "type"
                                                                            ]
                                                                        },
                                                                        {
                                                                            "type": "object",
                                                                            "properties": {
                                                                                "type": {
                                                                                    "type": "string",
                                                                                    "enum": [
                                                                                        "grammar"
                                                                                    ]
                                                                                },
                                                                                "grammar": {
                                                                                    "type": "object",
                                                                                    "properties": {
                                                                                        "definition": {
                                                                                            "type": "string"
                                                                                        },
                                                                                        "syntax": {
                                                                                            "type": "string",
                                                                                            "enum": [
                                                                                                "lark",
                                                                                                "regex"
                                                                                            ]
                                                                                        }
                                                                                    },
                                                                                    "required": [
                                                                                        "definition",
                                                                                        "syntax"
                                                                                    ]
                                                                                }
                                                                            },
                                                                            "required": [
                                                                                "type",
                                                                                "grammar"
                                                                            ]
                                                                        }
                                                                    ]
                                                                }
                                                            },
                                                            "required": [
                                                                "name"
                                                            ]
                                                        }
                                                    },
                                                    "required": [
                                                        "type",
                                                        "custom"
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    "top_p": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": 0,
                                                "maximum": 1
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 1,
                                        "description": "Nucleus sampling: considers the results of the tokens with top_p probability mass."
                                    },
                                    "user": {
                                        "type": "string",
                                        "description": "A unique identifier representing your end-user, for abuse monitoring."
                                    },
                                    "web_search_options": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "description": "Options for the web search tool (when using built-in web search).",
                                                "properties": {
                                                    "search_context_size": {
                                                        "type": "string",
                                                        "enum": [
                                                            "low",
                                                            "medium",
                                                            "high"
                                                        ],
                                                        "default": "medium"
                                                    },
                                                    "user_location": {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "approximate"
                                                                ]
                                                            },
                                                            "approximate": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "city": {
                                                                        "type": "string"
                                                                    },
                                                                    "country": {
                                                                        "type": "string"
                                                                    },
                                                                    "region": {
                                                                        "type": "string"
                                                                    },
                                                                    "timezone": {
                                                                        "type": "string"
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "approximate"
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    "function_call": {
                                        "anyOf": [
                                            {
                                                "type": "string",
                                                "enum": [
                                                    "none",
                                                    "auto"
                                                ]
                                            },
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string"
                                                    }
                                                },
                                                "required": [
                                                    "name"
                                                ]
                                            }
                                        ]
                                    },
                                    "functions": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "name": {
                                                    "type": "string",
                                                    "description": "The name of the function to be called."
                                                },
                                                "description": {
                                                    "type": "string",
                                                    "description": "A description of what the function does."
                                                },
                                                "parameters": {
                                                    "type": "object",
                                                    "description": "The parameters the function accepts, described as a JSON Schema object."
                                                },
                                                "strict": {
                                                    "anyOf": [
                                                        {
                                                            "type": "boolean"
                                                        },
                                                        {
                                                            "type": "null"
                                                        }
                                                    ],
                                                    "default": false,
                                                    "description": "Whether to enable strict schema adherence."
                                                }
                                            },
                                            "required": [
                                                "name"
                                            ]
                                        },
                                        "minItems": 1,
                                        "maxItems": 128
                                    }
                                },
                                "required": [
                                    "prompt"
                                ]
                            },
                            {
                                "title": "Messages",
                                "properties": {
                                    "messages": {
                                        "type": "array",
                                        "description": "A list of messages comprising the conversation so far.",
                                        "items": {
                                            "oneOf": [
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "role": {
                                                            "type": "string",
                                                            "enum": [
                                                                "developer"
                                                            ]
                                                        },
                                                        "content": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "string"
                                                                },
                                                                {
                                                                    "type": "array",
                                                                    "items": {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "type": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "text"
                                                                                ]
                                                                            },
                                                                            "text": {
                                                                                "type": "string"
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "type",
                                                                            "text"
                                                                        ]
                                                                    }
                                                                }
                                                            ]
                                                        },
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "role",
                                                        "content"
                                                    ]
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "role": {
                                                            "type": "string",
                                                            "enum": [
                                                                "system"
                                                            ]
                                                        },
                                                        "content": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "string"
                                                                },
                                                                {
                                                                    "type": "array",
                                                                    "items": {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "type": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "text"
                                                                                ]
                                                                            },
                                                                            "text": {
                                                                                "type": "string"
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "type",
                                                                            "text"
                                                                        ]
                                                                    }
                                                                }
                                                            ]
                                                        },
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "role",
                                                        "content"
                                                    ]
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "role": {
                                                            "type": "string",
                                                            "enum": [
                                                                "user"
                                                            ]
                                                        },
                                                        "content": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "string"
                                                                },
                                                                {
                                                                    "type": "array",
                                                                    "items": {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "type": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "text",
                                                                                    "image_url",
                                                                                    "input_audio",
                                                                                    "file"
                                                                                ]
                                                                            },
                                                                            "text": {
                                                                                "type": "string"
                                                                            },
                                                                            "image_url": {
                                                                                "type": "object",
                                                                                "properties": {
                                                                                    "url": {
                                                                                        "type": "string"
                                                                                    },
                                                                                    "detail": {
                                                                                        "type": "string",
                                                                                        "enum": [
                                                                                            "auto",
                                                                                            "low",
                                                                                            "high"
                                                                                        ],
                                                                                        "default": "auto"
                                                                                    }
                                                                                }
                                                                            },
                                                                            "input_audio": {
                                                                                "type": "object",
                                                                                "properties": {
                                                                                    "data": {
                                                                                        "type": "string"
                                                                                    },
                                                                                    "format": {
                                                                                        "type": "string",
                                                                                        "enum": [
                                                                                            "wav",
                                                                                            "mp3"
                                                                                        ]
                                                                                    }
                                                                                }
                                                                            },
                                                                            "file": {
                                                                                "type": "object",
                                                                                "properties": {
                                                                                    "file_data": {
                                                                                        "type": "string"
                                                                                    },
                                                                                    "file_id": {
                                                                                        "type": "string"
                                                                                    },
                                                                                    "filename": {
                                                                                        "type": "string"
                                                                                    }
                                                                                }
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "type"
                                                                        ]
                                                                    },
                                                                    "minItems": 1
                                                                }
                                                            ]
                                                        },
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "role",
                                                        "content"
                                                    ]
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "role": {
                                                            "type": "string",
                                                            "enum": [
                                                                "assistant"
                                                            ]
                                                        },
                                                        "content": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "string"
                                                                },
                                                                {
                                                                    "type": "null"
                                                                },
                                                                {
                                                                    "type": "array",
                                                                    "items": {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "type": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "text",
                                                                                    "refusal"
                                                                                ]
                                                                            },
                                                                            "text": {
                                                                                "type": "string"
                                                                            },
                                                                            "refusal": {
                                                                                "type": "string"
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "type"
                                                                        ]
                                                                    }
                                                                }
                                                            ]
                                                        },
                                                        "refusal": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "string"
                                                                },
                                                                {
                                                                    "type": "null"
                                                                }
                                                            ]
                                                        },
                                                        "name": {
                                                            "type": "string"
                                                        },
                                                        "audio": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "id": {
                                                                            "type": "string"
                                                                        }
                                                                    },
                                                                    "required": [
                                                                        "id"
                                                                    ]
                                                                }
                                                            ]
                                                        },
                                                        "tool_calls": {
                                                            "type": "array",
                                                            "items": {
                                                                "oneOf": [
                                                                    {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "id": {
                                                                                "type": "string"
                                                                            },
                                                                            "type": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "function"
                                                                                ]
                                                                            },
                                                                            "function": {
                                                                                "type": "object",
                                                                                "properties": {
                                                                                    "name": {
                                                                                        "type": "string"
                                                                                    },
                                                                                    "arguments": {
                                                                                        "type": "string",
                                                                                        "description": "JSON-encoded arguments string."
                                                                                    }
                                                                                },
                                                                                "required": [
                                                                                    "name",
                                                                                    "arguments"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "id",
                                                                            "type",
                                                                            "function"
                                                                        ]
                                                                    },
                                                                    {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "id": {
                                                                                "type": "string"
                                                                            },
                                                                            "type": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "custom"
                                                                                ]
                                                                            },
                                                                            "custom": {
                                                                                "type": "object",
                                                                                "properties": {
                                                                                    "name": {
                                                                                        "type": "string"
                                                                                    },
                                                                                    "input": {
                                                                                        "type": "string"
                                                                                    }
                                                                                },
                                                                                "required": [
                                                                                    "name",
                                                                                    "input"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "id",
                                                                            "type",
                                                                            "custom"
                                                                        ]
                                                                    }
                                                                ]
                                                            }
                                                        },
                                                        "function_call": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "name": {
                                                                            "type": "string"
                                                                        },
                                                                        "arguments": {
                                                                            "type": "string"
                                                                        }
                                                                    },
                                                                    "required": [
                                                                        "name",
                                                                        "arguments"
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    },
                                                    "required": [
                                                        "role"
                                                    ]
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "role": {
                                                            "type": "string",
                                                            "enum": [
                                                                "tool"
                                                            ]
                                                        },
                                                        "content": {
                                                            "anyOf": [
                                                                {
                                                                    "type": "string"
                                                                },
                                                                {
                                                                    "type": "array",
                                                                    "items": {
                                                                        "type": "object",
                                                                        "properties": {
                                                                            "type": {
                                                                                "type": "string",
                                                                                "enum": [
                                                                                    "text"
                                                                                ]
                                                                            },
                                                                            "text": {
                                                                                "type": "string"
                                                                            }
                                                                        },
                                                                        "required": [
                                                                            "type",
                                                                            "text"
                                                                        ]
                                                                    }
                                                                }
                                                            ]
                                                        },
                                                        "tool_call_id": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "role",
                                                        "content",
                                                        "tool_call_id"
                                                    ]
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "role": {
                                                            "type": "string",
                                                            "enum": [
                                                                "function"
                                                            ]
                                                        },
                                                        "content": {
                                                            "type": "string"
                                                        },
                                                        "name": {
                                                            "type": "string"
                                                        }
                                                    },
                                                    "required": [
                                                        "role",
                                                        "content",
                                                        "name"
                                                    ]
                                                }
                                            ]
                                        },
                                        "minItems": 1
                                    },
                                    "model": {
                                        "type": "string",
                                        "description": "ID of the model to use (e.g. '@cf/zai-org/glm-4.7-flash, etc')."
                                    },
                                    "audio": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "description": "Parameters for audio output. Required when modalities includes 'audio'.",
                                                "properties": {
                                                    "voice": {
                                                        "oneOf": [
                                                            {
                                                                "type": "string"
                                                            },
                                                            {
                                                                "type": "object",
                                                                "properties": {
                                                                    "id": {
                                                                        "type": "string"
                                                                    }
                                                                },
                                                                "required": [
                                                                    "id"
                                                                ]
                                                            }
                                                        ]
                                                    },
                                                    "format": {
                                                        "type": "string",
                                                        "enum": [
                                                            "wav",
                                                            "aac",
                                                            "mp3",
                                                            "flac",
                                                            "opus",
                                                            "pcm16"
                                                        ]
                                                    }
                                                },
                                                "required": [
                                                    "voice",
                                                    "format"
                                                ]
                                            }
                                        ]
                                    },
                                    "frequency_penalty": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": -2,
                                                "maximum": 2
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 0,
                                        "description": "Penalizes new tokens based on their existing frequency in the text so far."
                                    },
                                    "logit_bias": {
                                        "anyOf": [
                                            {
                                                "type": "object"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Modify the likelihood of specified tokens appearing in the completion. Maps token IDs to bias values from -100 to 100."
                                    },
                                    "logprobs": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "Whether to return log probabilities of the output tokens."
                                    },
                                    "top_logprobs": {
                                        "anyOf": [
                                            {
                                                "type": "integer",
                                                "minimum": 0,
                                                "maximum": 20
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "How many top log probabilities to return at each token position (0-20). Requires logprobs=true."
                                    },
                                    "max_tokens": {
                                        "anyOf": [
                                            {
                                                "type": "integer"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Deprecated in favor of max_completion_tokens. The maximum number of tokens to generate."
                                    },
                                    "max_completion_tokens": {
                                        "anyOf": [
                                            {
                                                "type": "integer"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "An upper bound for the number of tokens that can be generated for a completion."
                                    },
                                    "metadata": {
                                        "anyOf": [
                                            {
                                                "type": "object"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Set of 16 key-value pairs that can be attached to the object."
                                    },
                                    "modalities": {
                                        "anyOf": [
                                            {
                                                "type": "array",
                                                "items": {
                                                    "type": "string",
                                                    "enum": [
                                                        "text",
                                                        "audio"
                                                    ]
                                                }
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Output types requested from the model (e.g. ['text'] or ['text', 'audio'])."
                                    },
                                    "n": {
                                        "anyOf": [
                                            {
                                                "type": "integer",
                                                "minimum": 1,
                                                "maximum": 128
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 1,
                                        "description": "How many chat completion choices to generate for each input message."
                                    },
                                    "parallel_tool_calls": {
                                        "type": "boolean",
                                        "default": true,
                                        "description": "Whether to enable parallel function calling during tool use."
                                    },
                                    "prediction": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "type": {
                                                        "type": "string",
                                                        "enum": [
                                                            "content"
                                                        ]
                                                    },
                                                    "content": {
                                                        "anyOf": [
                                                            {
                                                                "type": "string"
                                                            },
                                                            {
                                                                "type": "array",
                                                                "items": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "type": {
                                                                            "type": "string",
                                                                            "enum": [
                                                                                "text"
                                                                            ]
                                                                        },
                                                                        "text": {
                                                                            "type": "string"
                                                                        }
                                                                    },
                                                                    "required": [
                                                                        "type",
                                                                        "text"
                                                                    ]
                                                                }
                                                            }
                                                        ]
                                                    }
                                                },
                                                "required": [
                                                    "type",
                                                    "content"
                                                ]
                                            }
                                        ]
                                    },
                                    "presence_penalty": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": -2,
                                                "maximum": 2
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 0,
                                        "description": "Penalizes new tokens based on whether they appear in the text so far."
                                    },
                                    "reasoning_effort": {
                                        "anyOf": [
                                            {
                                                "type": "string",
                                                "enum": [
                                                    "low",
                                                    "medium",
                                                    "high"
                                                ]
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "Constrains effort on reasoning for reasoning models (o1, o3-mini, etc.)."
                                    },
                                    "chat_template_kwargs": {
                                        "type": "object",
                                        "properties": {
                                            "enable_thinking": {
                                                "type": "boolean",
                                                "default": true,
                                                "description": "Whether to enable reasoning, enabled by default."
                                            },
                                            "clear_thinking": {
                                                "type": "boolean",
                                                "default": false,
                                                "description": "If false, preserves reasoning context between turns."
                                            }
                                        }
                                    },
                                    "response_format": {
                                        "anyOf": [
                                            {
                                                "description": "Specifies the format the model must output.",
                                                "oneOf": [
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "text"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "json_object"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "json_schema"
                                                                ]
                                                            },
                                                            "json_schema": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "name": {
                                                                        "type": "string"
                                                                    },
                                                                    "description": {
                                                                        "type": "string"
                                                                    },
                                                                    "schema": {
                                                                        "type": "object"
                                                                    },
                                                                    "strict": {
                                                                        "anyOf": [
                                                                            {
                                                                                "type": "boolean"
                                                                            },
                                                                            {
                                                                                "type": "null"
                                                                            }
                                                                        ]
                                                                    }
                                                                },
                                                                "required": [
                                                                    "name"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "json_schema"
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    "seed": {
                                        "anyOf": [
                                            {
                                                "type": "integer"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "description": "If specified, the system will make a best effort to sample deterministically."
                                    },
                                    "service_tier": {
                                        "anyOf": [
                                            {
                                                "type": "string",
                                                "enum": [
                                                    "auto",
                                                    "default",
                                                    "flex",
                                                    "scale",
                                                    "priority"
                                                ]
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": "auto",
                                        "description": "Specifies the processing type used for serving the request."
                                    },
                                    "stop": {
                                        "description": "Up to 4 sequences where the API will stop generating further tokens.",
                                        "anyOf": [
                                            {
                                                "type": "null"
                                            },
                                            {
                                                "type": "string"
                                            },
                                            {
                                                "type": "array",
                                                "items": {
                                                    "type": "string"
                                                },
                                                "minItems": 1,
                                                "maxItems": 4
                                            }
                                        ]
                                    },
                                    "store": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "Whether to store the output for model distillation / evals."
                                    },
                                    "stream": {
                                        "anyOf": [
                                            {
                                                "type": "boolean"
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": false,
                                        "description": "If true, partial message deltas will be sent as server-sent events."
                                    },
                                    "stream_options": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "include_usage": {
                                                        "type": "boolean"
                                                    },
                                                    "include_obfuscation": {
                                                        "type": "boolean"
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    "temperature": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": 0,
                                                "maximum": 2
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 1,
                                        "description": "Sampling temperature between 0 and 2."
                                    },
                                    "tool_choice": {
                                        "anyOf": [
                                            {
                                                "description": "Controls which (if any) tool is called by the model. 'none' = no tools, 'auto' = model decides, 'required' = must call a tool.",
                                                "oneOf": [
                                                    {
                                                        "type": "string",
                                                        "enum": [
                                                            "none",
                                                            "auto",
                                                            "required"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "description": "Force a specific function tool.",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "function"
                                                                ]
                                                            },
                                                            "function": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "name": {
                                                                        "type": "string"
                                                                    }
                                                                },
                                                                "required": [
                                                                    "name"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "function"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "description": "Force a specific custom tool.",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "custom"
                                                                ]
                                                            },
                                                            "custom": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "name": {
                                                                        "type": "string"
                                                                    }
                                                                },
                                                                "required": [
                                                                    "name"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "custom"
                                                        ]
                                                    },
                                                    {
                                                        "type": "object",
                                                        "description": "Constrain to an allowed subset of tools.",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "allowed_tools"
                                                                ]
                                                            },
                                                            "allowed_tools": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "mode": {
                                                                        "type": "string",
                                                                        "enum": [
                                                                            "auto",
                                                                            "required"
                                                                        ]
                                                                    },
                                                                    "tools": {
                                                                        "type": "array",
                                                                        "items": {
                                                                            "type": "object"
                                                                        }
                                                                    }
                                                                },
                                                                "required": [
                                                                    "mode",
                                                                    "tools"
                                                                ]
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "allowed_tools"
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    "tools": {
                                        "type": "array",
                                        "description": "A list of tools the model may call.",
                                        "items": {
                                            "oneOf": [
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "type": {
                                                            "type": "string",
                                                            "enum": [
                                                                "function"
                                                            ]
                                                        },
                                                        "function": {
                                                            "type": "object",
                                                            "properties": {
                                                                "name": {
                                                                    "type": "string",
                                                                    "description": "The name of the function to be called."
                                                                },
                                                                "description": {
                                                                    "type": "string",
                                                                    "description": "A description of what the function does."
                                                                },
                                                                "parameters": {
                                                                    "type": "object",
                                                                    "description": "The parameters the function accepts, described as a JSON Schema object."
                                                                },
                                                                "strict": {
                                                                    "anyOf": [
                                                                        {
                                                                            "type": "boolean"
                                                                        },
                                                                        {
                                                                            "type": "null"
                                                                        }
                                                                    ],
                                                                    "default": false,
                                                                    "description": "Whether to enable strict schema adherence."
                                                                }
                                                            },
                                                            "required": [
                                                                "name"
                                                            ]
                                                        }
                                                    },
                                                    "required": [
                                                        "type",
                                                        "function"
                                                    ]
                                                },
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "type": {
                                                            "type": "string",
                                                            "enum": [
                                                                "custom"
                                                            ]
                                                        },
                                                        "custom": {
                                                            "type": "object",
                                                            "properties": {
                                                                "name": {
                                                                    "type": "string"
                                                                },
                                                                "description": {
                                                                    "type": "string"
                                                                },
                                                                "format": {
                                                                    "oneOf": [
                                                                        {
                                                                            "type": "object",
                                                                            "properties": {
                                                                                "type": {
                                                                                    "type": "string",
                                                                                    "enum": [
                                                                                        "text"
                                                                                    ]
                                                                                }
                                                                            },
                                                                            "required": [
                                                                                "type"
                                                                            ]
                                                                        },
                                                                        {
                                                                            "type": "object",
                                                                            "properties": {
                                                                                "type": {
                                                                                    "type": "string",
                                                                                    "enum": [
                                                                                        "grammar"
                                                                                    ]
                                                                                },
                                                                                "grammar": {
                                                                                    "type": "object",
                                                                                    "properties": {
                                                                                        "definition": {
                                                                                            "type": "string"
                                                                                        },
                                                                                        "syntax": {
                                                                                            "type": "string",
                                                                                            "enum": [
                                                                                                "lark",
                                                                                                "regex"
                                                                                            ]
                                                                                        }
                                                                                    },
                                                                                    "required": [
                                                                                        "definition",
                                                                                        "syntax"
                                                                                    ]
                                                                                }
                                                                            },
                                                                            "required": [
                                                                                "type",
                                                                                "grammar"
                                                                            ]
                                                                        }
                                                                    ]
                                                                }
                                                            },
                                                            "required": [
                                                                "name"
                                                            ]
                                                        }
                                                    },
                                                    "required": [
                                                        "type",
                                                        "custom"
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    "top_p": {
                                        "anyOf": [
                                            {
                                                "type": "number",
                                                "minimum": 0,
                                                "maximum": 1
                                            },
                                            {
                                                "type": "null"
                                            }
                                        ],
                                        "default": 1,
                                        "description": "Nucleus sampling: considers the results of the tokens with top_p probability mass."
                                    },
                                    "user": {
                                        "type": "string",
                                        "description": "A unique identifier representing your end-user, for abuse monitoring."
                                    },
                                    "web_search_options": {
                                        "anyOf": [
                                            {
                                                "type": "object",
                                                "description": "Options for the web search tool (when using built-in web search).",
                                                "properties": {
                                                    "search_context_size": {
                                                        "type": "string",
                                                        "enum": [
                                                            "low",
                                                            "medium",
                                                            "high"
                                                        ],
                                                        "default": "medium"
                                                    },
                                                    "user_location": {
                                                        "type": "object",
                                                        "properties": {
                                                            "type": {
                                                                "type": "string",
                                                                "enum": [
                                                                    "approximate"
                                                                ]
                                                            },
                                                            "approximate": {
                                                                "type": "object",
                                                                "properties": {
                                                                    "city": {
                                                                        "type": "string"
                                                                    },
                                                                    "country": {
                                                                        "type": "string"
                                                                    },
                                                                    "region": {
                                                                        "type": "string"
                                                                    },
                                                                    "timezone": {
                                                                        "type": "string"
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        "required": [
                                                            "type",
                                                            "approximate"
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    "function_call": {
                                        "anyOf": [
                                            {
                                                "type": "string",
                                                "enum": [
                                                    "none",
                                                    "auto"
                                                ]
                                            },
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string"
                                                    }
                                                },
                                                "required": [
                                                    "name"
                                                ]
                                            }
                                        ]
                                    },
                                    "functions": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "name": {
                                                    "type": "string",
                                                    "description": "The name of the function to be called."
                                                },
                                                "description": {
                                                    "type": "string",
                                                    "description": "A description of what the function does."
                                                },
                                                "parameters": {
                                                    "type": "object",
                                                    "description": "The parameters the function accepts, described as a JSON Schema object."
                                                },
                                                "strict": {
                                                    "anyOf": [
                                                        {
                                                            "type": "boolean"
                                                        },
                                                        {
                                                            "type": "null"
                                                        }
                                                    ],
                                                    "default": false,
                                                    "description": "Whether to enable strict schema adherence."
                                                }
                                            },
                                            "required": [
                                                "name"
                                            ]
                                        },
                                        "minItems": 1,
                                        "maxItems": 128
                                    }
                                },
                                "required": [
                                    "messages"
                                ]
                            }
                        ]
                    }
                }
            }
        }
    ]
}