'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getPromptForQuestionType } from "@/lib/ai/prompts"
import { getEngineConfig } from "@/lib/ai/engines"

function calculateAiCostInUSD(model: string, promptTokens: number, completionTokens: number): number {
    const pricesPer1M: Record<string, { prompt: number; completion: number }> = {
        'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
        'gpt-4o': { prompt: 5.00, completion: 15.00 },
        'gpt-4-turbo': { prompt: 10.00, completion: 30.00 },
        'gemini-1.5-pro': { prompt: 3.50, completion: 10.50 },
        'claude-3-5-sonnet': { prompt: 3.00, completion: 15.00 },
        'deepseek-chat': { prompt: 0.14, completion: 0.28 },
        'openrouter': { prompt: 0.15, completion: 0.60 },
    };

    const rate = pricesPer1M[model] || pricesPer1M['gpt-4o-mini'];
    const promptCost = (promptTokens / 1_000_000) * rate.prompt;
    const completionCost = (completionTokens / 1_000_000) * rate.completion;
    
    return promptCost + completionCost;
}

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

        // Roteamento de Endpoints via arquivo de configuração (engines.ts)
        const { endpoint, bodyModel, headers } = getEngineConfig(aiModel, aiKey);

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
        
        // Faturamento (Billing)
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        
        if (promptTokens > 0 || completionTokens > 0) {
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            const usdToBrlRate = globalSettings?.usdToBrlRate || 5.50;
            const costUsd = calculateAiCostInUSD(bodyModel, promptTokens, completionTokens);
            const costBrl = costUsd * usdToBrlRate;
            
            await prisma.aiUsageLog.create({
                data: {
                    teacherId: user.id,
                    institutionId: user.institutionId,
                    modelUsed: bodyModel,
                    promptTokens,
                    completionTokens,
                    costInBRL: costBrl
                }
            });
        }

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

export async function gradeStudentAnswer(questionContent: string, referenceAnswer: string, studentAnswer: string, teacherId?: number, correctionMode: string = "CONCEPTUAL", studentImage?: string, referenceImage?: string, questionType: string = "ESSAY") {
    try {
        let user;
        
        if (teacherId) {
            // Se o ID do professor for fornecido (ex: entrega de aluno), buscamos direto
            user = await prisma.user.findUnique({
                where: { id: teacherId },
                include: { institution: true }
            });
        } else {
            // Fallback para sessão (ex: professor testando ou criando questões)
            const session = await auth();
            if (!session?.user?.email) return { success: false, error: "Não autorizado" };
            user = await prisma.user.findUnique({
                where: { email: session.user.email },
                include: { institution: true }
            });
        }

        if (!user) return { success: false, error: "Usuário/Professor não encontrado" };

        let aiKey = "";
        let aiModel = "";

        if (user.institution?.hasIntegratedAi) {
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            aiKey = globalSettings?.globalAiKey || "";
            aiModel = globalSettings?.globalAiModel || "gpt-4o";
        } else if (user.institution) {
            aiKey = user.institution.customAiKey || "";
            aiModel = user.institution.customAiModel || "gpt-4o";
        } else if (user.roleId === 1) {
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            aiKey = globalSettings?.globalAiKey || "";
            aiModel = globalSettings?.globalAiModel || "gpt-4o";
        } else {
            return { success: false, error: "Sem acesso a uma IA configurada." };
        }

        if (!aiKey) return { success: false, error: "IA não configurada." };

        // Roteamento de Endpoints via arquivo de configuração (engines.ts)
        const { endpoint, bodyModel, headers } = getEngineConfig(aiModel, aiKey);

        const systemPrompt = getPromptForQuestionType(questionType, correctionMode);

        let userMessageContent: any[] | string = `QUESTÃO: ${questionContent}\nGABARITO DO PROFESSOR: ${referenceAnswer}\nRESPOSTA DO ALUNO: ${studentAnswer}`;

        if (studentImage || referenceImage) {
            userMessageContent = [
                { type: "text", text: `QUESTÃO: ${questionContent}\nGABARITO DO PROFESSOR (TEXTO): ${referenceAnswer}\nRESPOSTA DO ALUNO (TEXTO): ${studentAnswer}` }
            ];

            if (referenceImage) {
                userMessageContent[0].text += `\n[O Professor também forneceu uma imagem de desenvolvimento/gabarito que está anexada nesta mensagem]`;
                userMessageContent.push({
                    type: "image_url",
                    image_url: { url: referenceImage }
                });
            }

            if (studentImage) {
                userMessageContent[0].text += `\n[O Aluno enviou uma imagem de desenvolvimento/rascunho que está anexada nesta mensagem]`;
                userMessageContent.push({
                    type: "image_url",
                    image_url: { url: studentImage }
                });
            }
        }

        const bodyPayload = {
            model: bodyModel,
            messages: [
                {
                    role: "system",
                    content: systemPrompt + `\n\nOUTPUT: Retorne APENAS um objeto JSON no formato: {"analysis": "sua análise passo a passo secreta sobre a validade do raciocínio e cálculo antes de dar a nota", "score": number, "feedback": "string"}. NADA MAIS. O feedback deve ser uma explicação curta (máx 150 caracteres) justificando a nota para o aluno.`
                },
                {
                    role: "user",
                    content: userMessageContent
                }
            ],
            temperature: 0,
            max_tokens: 300,
            response_format: { type: "json_object" }
        };

        console.log("=========================================");
        console.log("[AI GRADING] Payload enviado para a IA:");
        console.log(JSON.stringify(bodyPayload, null, 2));
        console.log("=========================================");

        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            console.error("[AI GRADING] Erro da API HTTP:", response.status, await response.text());
            return { success: false, error: "IA indisponível no momento" };
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "{\"score\": 0, \"feedback\": \"Falha na análise.\"}";
        
        console.log("=========================================");
        console.log("[AI GRADING] Resposta crua recebida da IA:");
        console.log(content);
        console.log("=========================================");
        
        // Limpeza básica caso a IA coloque markdown
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const result = JSON.parse(content);

        // Faturamento (Billing)
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        
        if (promptTokens > 0 || completionTokens > 0) {
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            const usdToBrlRate = globalSettings?.usdToBrlRate || 5.50;
            const costUsd = calculateAiCostInUSD(bodyModel, promptTokens, completionTokens);
            const costBrl = costUsd * usdToBrlRate;
            
            await prisma.aiUsageLog.create({
                data: {
                    teacherId: user.id,
                    institutionId: user.institutionId,
                    modelUsed: bodyModel,
                    promptTokens,
                    completionTokens,
                    costInBRL: costBrl
                }
            });
        }

        return { 
            success: true, 
            score: Math.min(100, Math.max(0, Number(result.score) || 0)),
            feedback: result.feedback || "Sem comentários adicionais."
        };
    } catch (e: any) {
        console.error("AI Grade Error:", e);
        return { success: false, error: e.message };
    }
}
