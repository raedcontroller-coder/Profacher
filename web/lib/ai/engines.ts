export interface AiEngineConfig {
    endpoint: string;
    bodyModel: string;
    headers: Record<string, string>;
    /** Nome registrado no AiUsageLog/billing. Igual a bodyModel, exceto NVIDIA ("nvidia:<modelo>"), para o custo ser identificado pelo provedor. */
    usageModel: string;
}

export function getEngineConfig(aiModel: string, aiKey: string): AiEngineConfig {
    let endpoint = "https://api.openai.com/v1/chat/completions";
    let bodyModel = aiModel;

    // Auto-upgrade do gpt-3.5-turbo para gpt-4o-mini (3.5 não suporta visão e o 4o-mini é mais barato)
    if (bodyModel === 'gpt-3.5-turbo') {
        bodyModel = 'gpt-4o-mini';
    }

    // Roteamento de APIs
    // Provedores com nome de modelo livre (ver lib/ai/models.ts): "nvidia:<modelo>" e "openrouter:<modelo>".
    // Checados primeiro porque o nome do modelo pode conter "deepseek", "gemini", "groq", etc., e cairia nos outros ramos.
    if (aiModel.startsWith('nvidia:')) {
        // NVIDIA NIM (build.nvidia.com), ex: "nvidia:meta/llama-3.2-90b-vision-instruct"
        endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
        bodyModel = aiModel.slice('nvidia:'.length).trim();
    } else if (aiModel.startsWith('openrouter:')) {
        // OpenRouter com modelo escolhido pelo admin, ex: "openrouter:anthropic/claude-3.5-sonnet"
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        bodyModel = aiModel.slice('openrouter:'.length).trim() || "openai/gpt-4o-mini";
    } else if (aiModel === 'openrouter') {
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        // Fallback veloz e barato do OpenRouter caso selecionem o genérico (valor legado, antes do campo de modelo livre)
        bodyModel = "openai/gpt-4o-mini";
    } else if (aiModel.includes('deepseek')) {
        endpoint = "https://api.deepseek.com/chat/completions";
    } else if (aiModel.includes('groq')) {
        endpoint = "https://api.groq.com/openai/v1/chat/completions";
        bodyModel = bodyModel.replace('groq-', ''); // Remove o prefixo para passar apenas o nome do modelo
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

    return { endpoint, bodyModel, headers, usageModel: endpoint.includes('integrate.api.nvidia.com') ? `nvidia:${bodyModel}` : bodyModel };
}
