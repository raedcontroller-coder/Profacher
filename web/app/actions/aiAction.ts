'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function generateMathEquation(prompt: string) {
    const session = await auth();
    if (!session?.user?.email) return { success: false, error: "Não autorizado" };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { institution: true }
        });

        if (!user) return { success: false, error: "Usuário não encontrado" };

        let aiKey = "";
        let aiModel = "";

        // Roteamento Hierárquico: Instituição Integrada vs Customizada vs Admin Global
        if (user.institution?.hasIntegratedAi) {
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            aiKey = globalSettings?.globalAiKey || "";
            aiModel = globalSettings?.globalAiModel || "gpt-4o";
        } else if (user.institution) {
            aiKey = user.institution.customAiKey || "";
            aiModel = user.institution.customAiModel || "gpt-4o";
        } else if (user.roleId === 1) { // fallback para Admin (Role 1 = Admin)
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            aiKey = globalSettings?.globalAiKey || "";
            aiModel = globalSettings?.globalAiModel || "gpt-4o";
        } else {
            return { success: false, error: "Sem acesso a uma API de IA configurada." };
        }

        if (!aiKey) {
            return { success: false, error: "Chave de API não configurada no sistema. Verifique o painel administrativo." };
        }

        // Sistema de Roteamento de Endpoints (Compatibilidade Nativa via Fetch)
        let endpoint = "https://api.openai.com/v1/chat/completions";
        let bodyModel = aiModel;

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
            headers["HTTP-Referer"] = "http://localhost:3000";
            headers["X-Title"] = "Profacher 2.0";
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({
                model: bodyModel,
                messages: [
                    {
                        role: "system",
                        content: `Você é um gerador ultrapreciso de equações matemáticas. O usuário digitará um texto narrando um cálculo (ex: 'função de x igual a...'). Sua ÚNICA e EXCLUSIVA tarefa é traduzir essa requisição humana diretamente para a sintaxe TeX / LaTeX correspondente. 
REGRAS CRÍTICAS DE OUTPUT:
1. TRADUZA TUDO: Se o usuário iniciar a frase declarando uma função (ex: "Funcao de x = ", "f de x igual a", "y igual a"), VOCÊ DEVE OBRIGATORIAMENTE incluir "f(x) =" ou "y =" no início da sua resposta em LaTeX.
2. Retorne APENAS a fórmula matemática codificada em LaTeX. NADA MAIS. Nenhuma de suas palavras deve conter saudações ou descrições (como "Aqui está a fórmula:").
3. NÃO use acentos graves de Markdown para cercar a resposta (nada de \`\`\`latex ou \`\`\`).
4. NÃO use os símbolos de bloco/início do LaTeX (nada de $$ x=1 $$ ou $ x=1 $ ou \\[ ou \\]). Retorne apenas o algoritmo matemático.
Exemplo 1 (Entrada: ab ponto 8 mais pi quadrado sobre delta): \\frac{ab \\cdot 8 + \\pi^2}{\\Delta}
Exemplo 2 (Entrada: fx é três elevado a 20): f(x) = 3^{20}
Exemplo 3 (Entrada: Função y igual a log de dez): y = \\log_{10}`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1, // temperatura baixa para maior consistência sintática
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("AI Math Error payload:", err);
            return { success: false, error: `Falha na requisição da IA (${response.status})` };
        }

        const data = await response.json();
        let latex = data.choices?.[0]?.message?.content || "";
        
        // Sanitizar agressivamente a resposta da IA caso ela desobedeça o prompt
        latex = latex.replace(/```latex/gi, "")
                     .replace(/```/g, "")
                     .replace(/^\$\$?|\$\$?$/g, '')
                     .replace(/^\\\[|\\\]$/g, '') // remove \[ \]
                     .trim();

        return { success: true, latex };
    } catch (error: any) {
        console.error("AI Error:", error);
        return { success: false, error: "Falha de comunicação com o serviço de IA. " + error.message };
    }
}
