import { describe, it, expect } from 'vitest'
import {
    getEngineConfig
} from '@/lib/ai/engines'
import {
    getCustomProvider,
    getProviderSelectValue,
    getCustomModelName,
    changeProvider,
    changeCustomModelName,
    isCustomModelIncomplete
} from '@/lib/ai/models'

describe('AI Models Helper & Routing', () => {
    describe('models.ts helpers', () => {
        it('identifica corretamente provedores de modelo customizado', () => {
            expect(getCustomProvider('openrouter:deepseek/deepseek-r1')?.prefix).toBe('openrouter:')
            expect(getCustomProvider('nvidia:meta/llama-3.2-90b-vision-instruct')?.prefix).toBe('nvidia:')
            expect(getCustomProvider('openrouter')?.prefix).toBe('openrouter:')
            expect(getCustomProvider('gpt-4o')).toBeNull()
        })

        it('extrai o nome customizado do modelo sem prefixo', () => {
            expect(getCustomModelName('openrouter:meta-llama/llama-3.3-70b-instruct')).toBe('meta-llama/llama-3.3-70b-instruct')
            expect(getCustomModelName('nvidia:meta/llama-3.2-11b-vision-instruct')).toBe('meta/llama-3.2-11b-vision-instruct')
            expect(getCustomModelName('openrouter')).toBe('')
            expect(getCustomModelName('gpt-4o')).toBe('')
        })

        it('detecta modelos customizados incompletos', () => {
            expect(isCustomModelIncomplete('openrouter:')).toBe(true)
            expect(isCustomModelIncomplete('openrouter:   ')).toBe(true)
            expect(isCustomModelIncomplete('nvidia:')).toBe(true)
            expect(isCustomModelIncomplete('nvidia:meta/llama-3.2-90b-vision-instruct')).toBe(false)
            expect(isCustomModelIncomplete('gpt-4o')).toBe(false)
            expect(isCustomModelIncomplete(null)).toBe(false)
        })

        it('altera provedor e monta modelo customizado adequadamente', () => {
            const novoValorNvidia = changeProvider('gpt-4o', 'nvidia:')
            expect(novoValorNvidia).toBe('nvidia:')

            const modeloDigitado = changeCustomModelName('nvidia:', 'meta/llama-3.2-90b-vision-instruct')
            expect(modeloDigitado).toBe('nvidia:meta/llama-3.2-90b-vision-instruct')

            const novoValorOpenRouter = changeProvider(modeloDigitado, 'openrouter:')
            expect(novoValorOpenRouter).toBe('openrouter:')
        })
    })

    describe('engines.ts routing', () => {
        it('roteia OpenRouter customizado para endpoint correto', () => {
            const config = getEngineConfig('openrouter:anthropic/claude-3.5-sonnet', 'sk-or-test')
            expect(config.endpoint).toBe('https://openrouter.ai/api/v1/chat/completions')
            expect(config.bodyModel).toBe('anthropic/claude-3.5-sonnet')
            expect(config.headers['Authorization']).toBe('Bearer sk-or-test')
            expect(config.headers['HTTP-Referer']).toBe('http://localhost:3000')
        })

        it('roteia NVIDIA customizado para endpoint correto', () => {
            const config = getEngineConfig('nvidia:meta/llama-3.2-90b-vision-instruct', 'nvapi-test')
            expect(config.endpoint).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
            expect(config.bodyModel).toBe('meta/llama-3.2-90b-vision-instruct')
            expect(config.usageModel).toBe('nvidia:meta/llama-3.2-90b-vision-instruct')
            expect(config.headers['Authorization']).toBe('Bearer nvapi-test')
        })

        it('mantem fallback legado do openrouter generico', () => {
            const config = getEngineConfig('openrouter', 'sk-or-test')
            expect(config.endpoint).toBe('https://openrouter.ai/api/v1/chat/completions')
            expect(config.bodyModel).toBe('openai/gpt-4o-mini')
        })
    })
})

