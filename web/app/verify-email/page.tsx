import React from 'react'
import { verifyEmailTokenAction } from './actions'
import VerifyEmailClient from './VerifyEmailClient'

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams
  const token = typeof resolvedParams.token === 'string' ? resolvedParams.token : null

  const result = token ? await verifyEmailTokenAction(token) : { error: "Link de confirmação inválido." }

  return <VerifyEmailClient result={result} />
}
