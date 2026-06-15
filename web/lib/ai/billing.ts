import { prisma } from "@/lib/prisma"

export function calculateAiCostInUSD(model: string, promptTokens: number, completionTokens: number): number {
    const pricesPer1M: Record<string, { prompt: number; completion: number }> = {
        'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
        'gpt-4o': { prompt: 5.00, completion: 15.00 },
        'gpt-4-turbo': { prompt: 10.00, completion: 30.00 },
        'gemini-1.5-pro': { prompt: 3.50, completion: 10.50 },
        'claude-3-5-sonnet': { prompt: 3.00, completion: 15.00 },
        'deepseek-chat': { prompt: 0.14, completion: 0.28 },
        'llama-3.2-11b-vision-preview': { prompt: 0.00, completion: 0.00 }, // Groq API free tier
        'llama-3.2-90b-vision-preview': { prompt: 0.00, completion: 0.00 }, // Groq API free tier
        'llama-3.1-70b-versatile': { prompt: 0.00, completion: 0.00 }, // Groq API free tier
    };

    const normalizedModel = model.split('/').pop()?.toLowerCase() || model.toLowerCase();

    let rate = pricesPer1M[normalizedModel];

    if (!rate) {
        if (normalizedModel.includes('gpt-4o-mini')) rate = pricesPer1M['gpt-4o-mini'];
        else if (normalizedModel.includes('gpt-4o')) rate = pricesPer1M['gpt-4o'];
        else if (normalizedModel.includes('gpt-4-turbo')) rate = pricesPer1M['gpt-4-turbo'];
        else if (normalizedModel.includes('gemini')) rate = pricesPer1M['gemini-1.5-pro'];
        else if (normalizedModel.includes('claude')) rate = pricesPer1M['claude-3-5-sonnet'];
        else if (normalizedModel.includes('deepseek')) rate = pricesPer1M['deepseek-chat'];
        else if (normalizedModel.includes('llama-3.2-11b')) rate = pricesPer1M['llama-3.2-11b-vision-preview'];
        else if (normalizedModel.includes('llama-3.2-90b')) rate = pricesPer1M['llama-3.2-90b-vision-preview'];
        else if (normalizedModel.includes('llama-3.1-70b')) rate = pricesPer1M['llama-3.1-70b-versatile'];
        else rate = pricesPer1M['gpt-4o-mini']; // Fallback seguro
    }

    const promptCost = (promptTokens / 1_000_000) * rate.prompt;
    const completionCost = (completionTokens / 1_000_000) * rate.completion;
    
    return promptCost + completionCost;
}

export async function logAiUsage(
    teacherId: number,
    institutionId: number | null,
    bodyModel: string,
    promptTokens: number,
    completionTokens: number
) {
    if (promptTokens === 0 && completionTokens === 0) return;

    try {
        const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const usdToBrlRate = globalSettings?.usdToBrlRate || 5.50;
        const costUsd = calculateAiCostInUSD(bodyModel, promptTokens, completionTokens);
        const costBrl = costUsd * usdToBrlRate;
        
        await prisma.aiUsageLog.create({
            data: {
                teacherId,
                institutionId,
                modelUsed: bodyModel,
                promptTokens,
                completionTokens,
                costInBRL: costBrl
            }
        });
    } catch (e) {
        console.error("Erro ao registrar custo de IA:", e);
    }
}
