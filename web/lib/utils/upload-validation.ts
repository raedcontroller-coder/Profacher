// Única fonte de verdade sobre quais formatos o upload de prova física (gabarito e
// submissões do aluno) aceita — usada tanto nos componentes cliente (validação antes de
// subir, evitando gasto de upload/IA com formato inválido) quanto na rota /api/upload
// (defesa em profundidade, caso algo chegue sem passar pela validação do cliente).
export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const

export const ACCEPTED_UPLOAD_ACCEPT_ATTR = ACCEPTED_UPLOAD_MIME_TYPES.join(',')

export function isAcceptedUploadType(file: { type: string }): boolean {
  return (ACCEPTED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)
}
