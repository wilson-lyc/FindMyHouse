import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

async function main() {
  const llm = new ChatOpenAI({
    model: 'deepseek-v4-flash',
    temperature: 0,
    apiKey: 'sk-749aefcd07cc4552a343bc4f6a1d7c7e',
    configuration: {
      baseURL: 'https://api.deepseek.com',
    },
  });

  const response = await llm.invoke([
    new SystemMessage('你是一个助手，回答用户问题，回答要简短。'),
    new HumanMessage('帮我找5000以下的房源'),
  ]);

  console.log("=== CONTENT ===");
  console.log(JSON.stringify(response.content));
  console.log("=== TOOL CALLS ===");
  console.log(JSON.stringify(response.tool_calls));
  console.log("=== ADDITIONAL KWARGS ===");
  const { id, lc, ...rest } = response.additional_kwargs;
  console.log(JSON.stringify(rest));
  console.log("=== RESPONSE METADATA ===");
  console.log(JSON.stringify(response.response_metadata));
}

main().catch(console.error);
