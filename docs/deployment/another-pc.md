# Usar o Sara Core em outro PC

O pacote portátil contém o frontend, a API, um runtime Node.js para Windows e uma cópia editável do código em `source`. O PC original pode ficar desligado. O banco PostgreSQL atual e o provedor de IA continuam sendo serviços externos e precisam de internet e credenciais válidas.

## Levar o pacote

No projeto original, execute `npm run portable:pack`. Copie o ZIP de `artifacts/portable` para o novo PC. A geração inclui as mudanças atuais do código, mesmo antes de um commit.

Quando há um `.env` com `DATABASE_URL`, as configurações necessárias são guardadas no pacote como `config.sealed.json`, usando AES 256 GCM. A chave aleatória fica em um arquivo separado, em `docs/private`, cujo caminho é mostrado ao terminar. Guarde a chave em um gerenciador de senhas ou transfira por outro canal. Quem obtiver o ZIP e a chave poderá usar as credenciais do banco e do provedor.

O pacote não contém `.env` em texto aberto, histórico Git, chave permanente da API ou logs do PC original. O arquivo `.sha256` ao lado do ZIP permite conferir sua integridade com `Get-FileHash` no PowerShell.

## Iniciar no novo PC

1. Extraia o ZIP para uma pasta particular do seu usuário. O runtime incluído corresponde à arquitetura do Windows usado na geração.
2. Abra `Iniciar-Sara.bat`. Cole a chave de recuperação quando solicitada; ela não será exibida no terminal. A configuração descriptografada permanece na memória do processo.
3. Mantenha a janela aberta e abra `http://127.0.0.1:5190/ecology` no navegador.
4. Confira `http://127.0.0.1:5190/api/v1/health`: `status` deve ser `ok` e `database.ok` deve ser `true`.

O pacote já inclui as dependências de execução: não exige instalar Node.js, npm ou ferramentas de programação para abrir o sistema. Para editar o código em `source`, instale Node.js 22 ou superior, execute `npm ci` e configure um `.env` privado nessa cópia.

Se não foi gerada configuração criptografada, copie `.env.template` para `.env` na raiz do pacote e preencha `DATABASE_URL`. Para ativar a interpretação por IA e as respostas científicas ao vivo, configure também `LLM_PROVIDER`, `LLM_API_KEY` e, quando necessário, `LLM_MODEL`. Não cole credenciais no frontend ou em configurações `VITE_*`.

## Segurança da API local

O iniciador atende apenas em `127.0.0.1`. Não é um servidor público nem uma forma de compartilhar o sistema pela rede. A API interna usa uma porta local aleatória e uma chave temporária criada a cada execução; o servidor intermediário envia essa chave, e o navegador recebe somente o caminho `/api/v1`.

O servidor rejeita hosts e origens diferentes, bloqueia chamadas de outras páginas e mantém a autenticação e o limite de requisições do backend. A conexão com PostgreSQL usa `verify-full`, com verificação do certificado. Esse modo é recomendado pela [documentação do Neon](https://neon.com/docs/connect/connect-securely).

Se a porta 5190 estiver ocupada, defina `SARA_LOCAL_PORT` com outra porta antes de iniciar. O iniciador não encerra outros programas para liberar portas. Em computador compartilhado, use seu próprio usuário do Windows, mantenha os arquivos e a chave privados e encerre o servidor ao terminar.

## Funcionalidades e dependências

| Funcionalidade | Requisitos |
| --- | --- |
| Terreno e fauna 3D de demonstração | Pacote extraído e navegador com WebGL; cenários pré-calculados funcionam sem internet. |
| Novo terreno, fauna, sucessão e cenários determinísticos | API local em execução; interpretação por IA depende do provedor configurado. |
| Catálogo e consulta de dados ecológicos | API e conexão com PostgreSQL. |
| Consulta científica com resposta por IA | PostgreSQL, provedor de IA, chave válida e acesso à internet. |
| Geração de relatórios e bioinvasão | API local; dados e interpretação dependem dos serviços configurados. |
| Código editável | Pasta `source`, Node.js e reinstalação com `npm ci`. |

Sem internet, o modo de demonstração continua disponível, mas ele mostra resultados pré-calculados. O pacote não inclui uma cópia dos dados atuais do PostgreSQL. Preserve o acesso à conta do banco e do provedor; se pretende perder essas contas, faça também um backup independente do banco antes da transferência.

Para acesso somente pelo navegador em vários PCs, é necessário hospedar frontend e API, com HTTPS e autenticação de usuários. Não exponha o iniciador local na internet nem publique as credenciais deste pacote.
