# Keep-alive do classificador na Render

Nesta instalação a API fica na Vercel. O ping da API encaminha um heartbeat ao
`/health` da Render configurada no servidor, com timeout de 8 segundos e cooldown
de 4 minutos por instância. Não encaminha chaves nem chama inferência. Falhas da
Render não derrubam o ping. O processo suspenso não executa seu próprio loop.

O aplicativo envia `GET /api/v1/health/ping` ao abrir e a cada 5 minutos,
usando a URL da API configurada nas preferências. Também tenta novamente quando
a conexão retorna ou a aba fica visível. O endpoint público responde
`{"message":"oi"}`, sem consultar o banco e com `Cache-Control: no-store`.
O `/health` existente continua verificando a saúde do banco separadamente.

Navegadores podem suspender temporizadores em abas em segundo plano. Com o
aplicativo fechado, seu ping para. Para continuar recebendo requisições,
execute o loop em uma máquina externa que permaneça ligada:

```sh
npm run keep-alive -- https://sara-core-one.vercel.app
```

Também aceita a variável `SARA_API_BASE_URL` e URLs terminadas em `/api/v1`.
O loop faz a primeira requisição imediatamente, limita cada tentativa a 60
segundos, continua após falhas e encerra com Ctrl+C/SIGTERM. Não execute esse
loop no próprio backend: um processo suspenso não consegue acordar a si mesmo.
Para um monitor HTTP externo, configure a mesma URL com `/api/v1/health/ping`
e intervalo de 5 minutos. Nenhum monitor externo foi criado automaticamente.

Segundo a [documentação da Render](https://render.com/docs/free), serviços
gratuitos suspendem após 15 minutos sem tráfego de entrada. O ping reduz essa
suspensão; não impede reinicializações, crashes, deploys ou esgotamento da cota
mensal de horas. É necessário publicar o backend e o frontend atualizados antes
de usar o novo endpoint em produção.
