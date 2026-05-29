import { getEssayPrompt } from '@/lib/ai/prompts/essay';
import { getMathPrompt } from '@/lib/ai/prompts/math';
import { getMultipleChoicePrompt } from '@/lib/ai/prompts/multiple_choice';
import { getCustomHtmlPrompt } from '@/lib/ai/prompts/custom_html';

export function getPromptForQuestionType(questionType: string, correctionMode: string): string {
    switch (questionType) {
        case 'MATH':
            return getMathPrompt(correctionMode);
        case 'MULTIPLE_CHOICE':
        case 'TRUE_FALSE':
            return getMultipleChoicePrompt(correctionMode);
        case 'CUSTOM_HTML':
            return getCustomHtmlPrompt(correctionMode);
        case 'ESSAY':
        default:
            return getEssayPrompt(correctionMode);
    }
}
