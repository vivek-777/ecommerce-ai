import { generateText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { StoreCity } from '../models/Store';
import {
  AGENT_HISTORY_LIMIT,
  AGENT_MAX_STEPS,
  AGENT_MODEL,
  buildAgentSystemPrompt,
  buildGreetingReply,
  DEFAULT_STORE,
} from '../constants/agent';
import {
  buildFallbackReply,
  detectsInStockIntent,
  parseMaxPriceFromText,
  RecommendationItem,
  resolveMentionedStore,
  runDeterministicInventorySearch,
} from '../utils/agentInventory';
import { createCheckStoreInventoryTool } from '../utils/agentTool';
import { GREETING_REGEX } from '../utils/regex';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentChatInput {
  message: string;
  storeId?: StoreCity;
  history?: ChatHistoryItem[];
}

export interface AgentChatResult {
  reply: string;
  storeId: StoreCity;
  recommendations: RecommendationItem[];
}

export async function runAgentChat({
  message,
  storeId = DEFAULT_STORE,
  history = [],
}: AgentChatInput): Promise<AgentChatResult> {
  const defaultTargetStore = resolveMentionedStore(message, storeId);

  if (GREETING_REGEX.test(message.trim())) {
    return {
      reply: buildGreetingReply(defaultTargetStore),
      storeId: defaultTargetStore,
      recommendations: [],
    };
  }

  const inferredInStockOnly = detectsInStockIntent(message);
  let resolvedStore: StoreCity = defaultTargetStore;
  let latestRecommendations: RecommendationItem[] = [];

  try {
    const result = await generateText({
      model: google(AGENT_MODEL),
      stopWhen: stepCountIs(AGENT_MAX_STEPS),
      system: buildAgentSystemPrompt(defaultTargetStore),
      messages: [
        ...history.slice(-AGENT_HISTORY_LIMIT),
        { role: 'user', content: message },
      ],
      tools: {
        checkStoreInventory: createCheckStoreInventoryTool({
          defaultTargetStore,
          inferredInStockOnly,
          onStoreResolved: (store) => {
            resolvedStore = store;
          },
          onRecommendationsUpdated: (items) => {
            latestRecommendations = items;
          },
        }),
      },
    });

    return {
      reply: result.text,
      storeId: resolvedStore,
      recommendations: latestRecommendations,
    };
  } catch (aiError) {
    console.warn('Gemini fallback triggered:', aiError);

    const fallbackRecommendations = await runDeterministicInventorySearch(
      message,
      defaultTargetStore,
      {
        maxPrice: parseMaxPriceFromText(message),
        inStockOnly: inferredInStockOnly,
      }
    );

    return {
      reply: buildFallbackReply(
        fallbackRecommendations,
        defaultTargetStore,
        inferredInStockOnly
      ),
      storeId: defaultTargetStore,
      recommendations: fallbackRecommendations,
    };
  }
}