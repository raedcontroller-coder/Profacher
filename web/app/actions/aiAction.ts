'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getPromptForQuestionType } from "@/lib/ai/prompts"
import { getEngineConfig } from "@/lib/ai/engines"
import { logAiUsage } from "@/lib/ai/billing"

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
        let fallbackKey = "";
        let fallbackModel = "";

        // Roteamento Hierárquico: Instituição Integrada vs Customizada vs Admin Global
        if (user.institution?.hasIntegratedAi || user.roleId === 1) {
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            aiKey = globalSettings?.globalAiKey || "";
            aiModel = globalSettings?.globalAiModel || "gpt-4o";
            
            if (globalSettings?.savedAiKeys && Array.isArray(globalSettings.savedAiKeys)) {
                const fb = (globalSettings.savedAiKeys as any[]).find((k) => k.isFallback);
                if (fb) {
                    fallbackKey = fb.key;
                    fallbackModel = fb.model;
                }
            }
        } else if (user.institution) {
            aiKey = user.institution.customAiKey || "";
            aiModel = user.institution.customAiModel || "gpt-4o";
        } else {
            return { success: false, error: "Sem acesso a uma API de IA configurada." };
        }

        if (!aiKey) {
            return { success: false, error: "Chave de API não configurada no sistema. Verifique o painel administrativo." };
        }

        async function attemptMathGeneration(modelToUse: string, keyToUse: string) {
            const { endpoint, bodyModel, headers } = getEngineConfig(modelToUse, keyToUse);

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
                throw new Error(`Falha na requisição da IA (${response.status}) - ${err}`);
            }

            const data = await response.json();
            return { data, bodyModel };
        }

        let aiData: any;
        let finalBodyModel = "";

        try {
            const res = await attemptMathGeneration(aiModel, aiKey);
            aiData = res.data;
            finalBodyModel = res.bodyModel;
        } catch (e: any) {
            console.warn("[AI MATH] Erro com a IA principal:", e.message);
            if (fallbackKey && fallbackModel) {
                console.log("[AI MATH] Tentando IA de Fallback...");
                const resFallback = await attemptMathGeneration(fallbackModel, fallbackKey);
                aiData = resFallback.data;
                finalBodyModel = resFallback.bodyModel;
            } else {
                throw e; // Lança para o catch de segurança
            }
        }

        let latex = aiData.choices?.[0]?.message?.content || "";
        
        // Faturamento (Billing)
        const promptTokens = aiData.usage?.prompt_tokens || 0;
        const completionTokens = aiData.usage?.completion_tokens || 0;
        
        await logAiUsage(user.id, user.institutionId, finalBodyModel, promptTokens, completionTokens);

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
        let fallbackKey = "";
        let fallbackModel = "";

        if (user.institution?.hasIntegratedAi || user.roleId === 1) {
            const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            aiKey = globalSettings?.globalAiKey || "";
            aiModel = globalSettings?.globalAiModel || "gpt-4o";
            
            if (globalSettings?.savedAiKeys && Array.isArray(globalSettings.savedAiKeys)) {
                const fb = (globalSettings.savedAiKeys as any[]).find((k) => k.isFallback);
                if (fb) {
                    fallbackKey = fb.key;
                    fallbackModel = fb.model;
                }
            }
        } else if (user.institution) {
            aiKey = user.institution.customAiKey || "";
            aiModel = user.institution.customAiModel || "gpt-4o";
        } else {
            return { success: false, error: "Sem acesso a uma IA configurada." };
        }

        if (!aiKey) return { success: false, error: "IA não configurada." };

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

        async function attemptGrading(modelToUse: string, keyToUse: string) {
            const { endpoint, bodyModel, headers } = getEngineConfig(modelToUse, keyToUse);
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

            const response = await fetch(endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify(bodyPayload)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Falha HTTP ${response.status}: ${err}`);
            }

            const data = await response.json();
            return { data, bodyModel };
        }

        let aiData: any;
        let finalBodyModel = "";

        try {
            const res = await attemptGrading(aiModel, aiKey);
            aiData = res.data;
            finalBodyModel = res.bodyModel;
        } catch (e: any) {
            console.warn("[AI GRADING] Erro com IA principal:", e.message);
            if (fallbackKey && fallbackModel) {
                console.log("[AI GRADING] Tentando IA de Fallback...");
                const resFallback = await attemptGrading(fallbackModel, fallbackKey);
                aiData = resFallback.data;
                finalBodyModel = resFallback.bodyModel;
            } else {
                throw e;
            }
        }

        let content = aiData.choices?.[0]?.message?.content || "{\"score\": 0, \"feedback\": \"Falha na análise.\"}";
        
        // Limpeza básica caso a IA coloque markdown
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const result = JSON.parse(content);

        // Faturamento (Billing)
        const promptTokens = aiData.usage?.prompt_tokens || 0;
        const completionTokens = aiData.usage?.completion_tokens || 0;
        
        await logAiUsage(user.id, user.institutionId, finalBodyModel, promptTokens, completionTokens);

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
