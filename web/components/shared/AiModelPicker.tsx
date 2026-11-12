'use client'

import React from 'react';
import {
    CUSTOM_MODEL_PROVIDERS,
    getCustomProvider,
    getProviderSelectValue,
    getCustomModelName,
    changeProvider,
    changeCustomModelName,
} from '@/lib/ai/models';

interface AiModelPickerProps {
    /** Valor salvo (ex: "gpt-4o" ou "nvidia:meta/llama-3.2-90b-vision-instruct"). */
    value: string;
    onChange: (model: string) => void;
    /** Modelos pré-definidos. Os provedores de modelo personalizado (OpenRouter/NVIDIA) são adicionados automaticamente ao final. */
    presetModels: { id: string; name: string }[];
    selectClassName?: string;
    inputClassName?: string;
    optionClassName?: string;
}

/**
 * Seletor de motor de IA: um <select> com modelos pré-definidos + provedores em que o
 * nome do modelo é digitado livremente (OpenRouter, NVIDIA). Ao escolher um desses,
 * aparece um campo de texto para o nome do modelo.
 */
export default function AiModelPicker({ value, onChange, presetModels, selectClassName, inputClassName, optionClassName }: AiModelPickerProps) {
    const customProvider = getCustomProvider(value);
    const selectValue = getProviderSelectValue(value);
    const isKnownPreset = presetModels.some((m) => m.id === selectValue);

    return (
        <div className="space-y-2">
            <select
                value={selectValue}
                onChange={(e) => onChange(changeProvider(value, e.target.value))}
                className={selectClassName}
            >
                {/* Mantém visível um modelo salvo que não está mais na lista (evita trocar o valor silenciosamente) */}
                {!customProvider && !isKnownPreset && value && (
                    <option value={value} className={optionClassName}>{value}</option>
                )}
                {presetModels.map((m) => (
                    <option key={m.id} value={m.id} className={optionClassName}>{m.name}</option>
                ))}
                {CUSTOM_MODEL_PROVIDERS.map((p) => (
                    <option key={p.prefix} value={p.prefix} className={optionClassName}>{p.label}</option>
                ))}
            </select>

            {customProvider && (
                <div className="space-y-1">
                    <input
                        type="text"
                        value={getCustomModelName(value)}
                        onChange={(e) => onChange(changeCustomModelName(value, e.target.value))}
                        placeholder={customProvider.placeholder}
                        spellCheck={false}
                        autoComplete="off"
                        className={inputClassName}
                    />
                    <p className="text-[10px] text-gray-500 ml-1">
                        Nome exato do modelo, como aparece em{' '}
                        <a href={customProvider.helpUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                            {customProvider.helpUrl.replace('https://', '')}
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
}

