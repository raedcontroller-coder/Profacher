export interface AiEngineConfig {
    endpoint: string;
    bodyModel: string;
    headers: Record<string, string>;
}

export function getEngineConfig(aiModel: string, aiKey: string): AiEngineConfig {
    let endpoint = "https://api.openai.com/v1/chat/completions";
    let bodyModel = aiModel;

    // Auto-upgrade do gpt-3.5-turbo para gpt-4o-mini (3.5 não suporta visão e o 4o-mini é mais barato)
    if (bodyModel === 'gpt-3.5-turbo') {
        bodyModel = 'gpt-4o-mini';
    }

    // Roteamento de APIs
    if (aiModel === 'openrouter') {
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        bodyModel = "openai/gpt-4o-mini"; // Fallback veloz e barato do OpenRouter caso selecionem o genérico
    } else if (aiModel.includes('deepseek')) {
        endpoint = "https://api.deepseek.com/chat/completions";
    } else if (aiModel.includes('gemini')) {
        // Se o usuário tentar usar gemini por fora do openrouter sem biblioteca do Google, tentamos openrouter fallback
        // Para maior estabilidade com o modelo OpenAI Format
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        bodyModel = "google/gemini-1.5-pro";
    }

    const headers: Record<string, string> = {
        "Authorization": `Bearer ${aiKey}`,
        "Content-Type": "application/json",
    };

    if (endpoint.includes('openrouter')) {
        headers["HTTP-Referer"] = "http://localhost:3000"; // Obrigatório pelo OpenRouter
        headers["X-Title"] = "Profacher 2.0"; // Obrigatório pelo OpenRouter
    }

    return { endpoint, bodyModel, headers };
}
