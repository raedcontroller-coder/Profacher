/**
 * Provedores em que o admin digita livremente o nome do modelo (em vez de escolher
 * um modelo pré-definido). O valor salvo no banco é "<prefixo><nome do modelo>",
 * ex: "openrouter:anthropic/claude-3.5-sonnet" ou "nvidia:meta/llama-3.2-90b-vision-instruct".
 * O roteamento por prefixo acontece em lib/ai/engines.ts.
 *
 * Este arquivo não importa nada de servidor — é seguro usar em Client Components.
 */
export const CUSTOM_MODEL_PROVIDERS = [
    {
        prefix: 'openrouter:',
        label: 'OpenRouter (modelo personalizado)',
        placeholder: 'ex: anthropic/claude-3.5-sonnet',
        helpUrl: 'https://openrouter.ai/models',
    },
    {
        prefix: 'nvidia:',
        label: 'NVIDIA (modelo personalizado)',
        placeholder: 'ex: meta/llama-3.2-90b-vision-instruct',
        helpUrl: 'https://build.nvidia.com/models',
    },
] as const

export type CustomModelProvider = (typeof CUSTOM_MODEL_PROVIDERS)[number]

/** Valor legado (antes do campo livre): "openrouter" puro = openai/gpt-4o-mini via OpenRouter. */
const LEGACY_OPENROUTER = 'openrouter'

export function getCustomProvider(model: string | null | undefined): CustomModelProvider | null {
    if (!model) return null
    if (model === LEGACY_OPENROUTER) return CUSTOM_MODEL_PROVIDERS[0]
    return CUSTOM_MODEL_PROVIDERS.find((p) => model.startsWith(p.prefix)) ?? null
}

/** Valor a exibir no <select>: o prefixo do provedor personalizado, ou o próprio modelo. */
export function getProviderSelectValue(model: string): string {
    return getCustomProvider(model)?.prefix ?? model
}

/** Nome digitado do modelo (parte após o prefixo). Vazio para modelos pré-definidos. */
export function getCustomModelName(model: string): string {
    const provider = getCustomProvider(model)
    if (!provider || model === LEGACY_OPENROUTER) return ''
    return model.slice(provider.prefix.length)
}

/** Novo valor de modelo ao trocar a opção do <select>, preservando o nome digitado se o provedor não mudou. */
export function changeProvider(currentModel: string, selectValue: string): string {
    const provider = CUSTOM_MODEL_PROVIDERS.find((p) => p.prefix === selectValue)
    if (!provider) return selectValue
    const sameProvider = getCustomProvider(currentModel)?.prefix === provider.prefix
    return provider.prefix + (sameProvider ? getCustomModelName(currentModel) : '')
}

/** Novo valor de modelo ao digitar o nome no campo livre. */
export function changeCustomModelName(currentModel: string, name: string): string {
    const provider = getCustomProvider(currentModel)
    if (!provider) return currentModel
    return provider.prefix + name.trim()
}

/** true quando um provedor personalizado foi escolhido mas o nome do modelo ainda não foi digitado. */
export function isCustomModelIncomplete(model: string | null | undefined): boolean {
    if (!model || model === LEGACY_OPENROUTER) return false
    const provider = getCustomProvider(model)
    return !!provider && model.slice(provider.prefix.length).trim() === ''
}

