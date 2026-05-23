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

export async function gradeStudentAnswer(questionContent: string, referenceAnswer: string, studentAnswer: string, teacherId?: number, correctionMode: string = "CONCEPTUAL", studentImage?: string, referenceImage?: string) {
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

        let endpoint = "https://api.openai.com/v1/chat/completions";
        let bodyModel = aiModel;

        if (aiModel === 'openrouter') {
            endpoint = "https://openrouter.ai/api/v1/chat/completions";
            bodyModel = "openai/gpt-4o-mini";
        } else if (aiModel.includes('deepseek')) {
            endpoint = "https://api.deepseek.com/chat/completions";
        } else if (aiModel.includes('gemini')) {
            endpoint = "https://openrouter.ai/api/v1/chat/completions";
            bodyModel = "google/gemini-1.5-pro";
        }

        const headers: Record<string, string> = {
            "Authorization": `Bearer ${aiKey}`,
            "Content-Type": "application/json",
        };

        const isConceptual = correctionMode === "CONCEPTUAL";

        const systemPrompt = isConceptual 
            ? `Você é um avaliador de provas ultrapreciso focado em ANÁLISE CONCEITUAL E INSTRUCIONAL.
            
Sua missão é dar uma nota para a resposta de um aluno baseando-se no "Gabarito de Referência" do professor.
IMPORTANTE: O gabarito pode conter INSTRUÇÕES de correção (ex: "considere certo se citar X"). Você deve PRIORIZAR o cumprimento dessas instruções sobre a comparação literal de texto.

REGRAS CRÍTICAS (MODO CONCEITUAL):
1. FOCO NA IDEIA: Se o aluno explicou o conceito corretamente, mesmo usando palavras totalmente diferentes da do professor, dê nota máxima.
2. INSTRUÇÕES VALEM TUDO: Se o gabarito disser "Considere correto se...", e o aluno atender ao critério, a nota é 100.
3. RIGOR LÓGICO E MATEMÁTICO: Se o gabarito especificar um intervalo numérico (ex: "entre 10 e 20"), um valor exato ou uma condição lógica binária, você deve segui-la RIGOROSAMENTE.
4. FLEXIBILIDADE CONCEITUAL: Seja benevolente com a escrita em respostas dissertativas. O que importa é se o aluno demonstrou conhecimento.
5. ANÁLISE DE IMAGENS DE CÁLCULO: Se houver uma imagem de desenvolvimento enviada pelo aluno (rascunho, foto, whiteboard), você DEVE analisar rigorosamente se os passos matemáticos estão corretos. Verifique: (a) se os procedimentos estão corretos passo a passo, (b) se o resultado final bate com o gabarito, (c) se há erros de raciocínio ou de cálculo. Erros matemáticos explícitos resultam em nota proporcional ao que foi feito corretamente. NÃO presuma que está certo apenas porque há uma imagem — analise o conteúdo visual com rigor matemático.
6. GABARITO VISUAL DO PROFESSOR: Se o professor forneceu uma imagem de gabarito de desenvolvimento, compare o desenvolvimento do aluno com o gabarito visual do professor passo a passo.
7. RESPOSTA CERTA, RACIOCÍNIO ERRADO = NOTA BAIXA: Para questões matemáticas ou de cálculo, uma resposta numericamente correta NÃO garante nota total se o desenvolvimento/raciocínio for matematicamente incoerente, inventado ou logicamente inválido.
   EXEMPLO: Questão pede quantas crianças têm menos de 12 anos (total=75, 2/5 têm mais de 12). Gabarito: 45 (via 3/5 × 75). Se o aluno escrever "90 ÷ 2 = 45" — a resposta final (45) está correta, mas o desenvolvimento (90 dividido por 2) é matematicamente sem sentido para este problema. Neste caso, a nota deve ser BAIXA (0 a 30), pois o aluno "chutou" ou usou um procedimento inválido. O raciocínio correto é condição obrigatória para nota alta.
8. RESPOSTA TOTALMENTE ERRADA = 0: Se o aluno errou completamente o raciocínio E a resposta final, ou se a resposta não tiver nenhuma relação com o que foi pedido, a NOTA DEVE SER ZERO (0). Não seja complacente com respostas inventadas ou absurdas.
9. ESCALA: 0 a 100. (100 = resposta correta COM desenvolvimento/raciocínio matematicamente válido e coerente; 0 = totalmente incorreto).`
            : `Você é um avaliador de provas focado em ANÁLISE COMPARATIVA E SEMÂNTICA.
            
Sua missão é dar uma nota comparando a resposta do aluno com o "Gabarito de Referência" do professor.

REGRAS CRÍTICAS (MODO COMPARATIVO):
1. SIMILARIDADE: A resposta do aluno deve ser semanticamente próxima e conter as informações principais presentes no gabarito.
2. RIGOR MATEMÁTICO/FATUAL: Seja extremamente criterioso com a precisão de números, datas, nomes e dados técnicos. Hallucinações numéricas resultam em nota 0.
3. RESPOSTA CERTA, RACIOCÍNIO ERRADO = NOTA BAIXA: Para questões matemáticas, uma resposta numericamente correta NÃO garante nota total se o desenvolvimento for matematicamente incoerente ou inventado. O aluno deve demonstrar o procedimento correto. Um resultado correto obtido por meio de um desenvolvimento inválido deve receber nota proporcional apenas à resposta final (ex: 10 a 20 de 100), sem crédito pelo desenvolvimento.
4. ANÁLISE DE IMAGENS: Se houver imagem de desenvolvimento do aluno, analise com rigor se os cálculos e procedimentos estão corretos. Não conceda pontos por imagens ilegíveis ou com erros claros.
5. RESPOSTA TOTALMENTE ERRADA = 0: Se a resposta (texto ou imagem) não fizer nenhum sentido matemático ou lógico para o problema, a NOTA É ZERO. Sem complacência.
6. ESCALA: 0 a 100.`;

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
                    content: systemPrompt + `\n\nOUTPUT: Retorne APENAS um objeto JSON no formato: {"score": number, "feedback": "string"}. NADA MAIS. O feedback deve ser uma explicação curta (máx 150 caracteres) justificando a nota.`
                },
                {
                    role: "user",
                    content: userMessageContent
                }
            ],
            temperature: 0,
            max_tokens: 300
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
