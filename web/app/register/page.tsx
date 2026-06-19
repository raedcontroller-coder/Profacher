import React from 'react'
import { redirect } from 'next/navigation'
import RegisterClient from './RegisterClient'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const token = typeof resolvedParams.token === 'string' ? resolvedParams.token : null

  if (!token) {
    redirect('/login')
  }

  return <RegisterClient token={token} />
}
