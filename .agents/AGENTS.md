# Regras de Homologação e Testes (HML)

As seguintes regras devem ser rigorosamente seguidas durante o desenvolvimento e testes deste projeto:

1. **Uso Exclusivo do Ambiente HML**: Todas as execuções de testes E2E e homologações devem ser feitas utilizando o banco de dados e bucket isolados de HML.
2. **Branch Release Candidate**: Nunca faça commits, pushs ou alterações diretas na branch `main`. Todo desenvolvimento e teste deve ser feito na branch `releasecandidate`.
3. **Segurança de Credenciais**: O arquivo `.env.hml` contém as credenciais do banco e S3 de homologação. Ele deve ser estritamente mantido no `.gitignore` e nunca deve ser versionado/commitado para o repositório.
