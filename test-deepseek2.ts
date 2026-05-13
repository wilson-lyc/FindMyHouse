import { getLlm } from './src/modules/langchain/llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

async function main() {
  const llm = getLlm();

  const systemPrompt = `你是一个专业的找房助手，帮助用户搜索和筛选房源。

你可以根据用户的自然语言描述，调用工具来搜索房源。在回答之前，先判断是否需要搜索房源。

工具列表：
1. search_houses

在回答时，如果用户想搜索房源，请先输出 ===TOOL_CALL=== 标记，然后在新行输出JSON。
JSON格式示例：
{"tool": "search_houses", "params": {"maxRentPrice": 5000}}

回答要简洁。`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage('帮我找5000以下的房源'),
  ]);

  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  console.log("=== RAW CONTENT ===");
  console.log(content);
  console.log("=== CONTENT LENGTH ===");
  console.log(content.length);
  console.log("=== CONTENT JSON ===");
  console.log(JSON.stringify(content));
}

main().catch(console.error);
