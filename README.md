# Mercadummy

Aplicação acadêmica de e-commerce com persistência poliglota. Escritas transacionais ficam no PostgreSQL; projeções de consulta são materializadas no MongoDB pela outbox; Redis mantém sessões e carrinhos.

## Subir localmente

1. Copie `.env.example` para `.env` e ajuste `SESSION_SECRET` e `API_KEY` antes de expor o serviço.
2. Execute `docker compose up --build` na raiz.
3. Abra o front em http://localhost:5173 e a documentação Swagger em http://localhost:3000/docs.

O Compose inicia Postgres, MongoDB como replica set de nó único e Redis. A migration inicial roda automaticamente, com `synchronize: false`. O Mongo cria os índices de leitura na inicialização da API. O catálogo começa vazio. Não há chamadas externas.

## Variáveis

Veja `.env.example`: conexão PostgreSQL/Mongo/Redis, origem CORS, segredo de sessão e chave para integração. O cookie `mercadummy.sid` é httpOnly e SameSite=Lax, com TTL renovado a cada requisição autenticada; carrinhos Redis expiram em sete dias e são renovados ao alterar itens.

## Primeiro anunciante e API key

Cadastre uma conta pelo formulário ou `POST /auth/register`. Para habilitar CRUD no usuário recém-criado, altere o papel usando o banco local:

```sql
UPDATE usuario SET papel = 'ANUNCIANTE' WHERE email = 'anunciante@example.com';
```

Para a carga automatizada, defina um valor secreto em `API_KEY` no `.env`, reinicie a API e envie-o no header `X-API-Key`. A primeira chamada autenticada por chave cria automaticamente o anunciante de sistema `system@mercadummy.local`.

## Criar produtos

Com sessão de anunciante:

```sh
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' -b cookies.txt -c cookies.txt \
  -d '{"nome":"Fone Bluetooth","descricao":"Fone sem fio","preco":99.90,"categoria":"eletronicos","atributos":{"cor":"preto"},"imagemUrl":"https://example.com/fone.jpg","imagens":[],"estoqueInicial":12,"externalId":"fone-001","origem":"catalogo-demo"}'
```

Ou com API key (contrato destinado à futura aplicação de carga):

```sh
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' -H 'X-API-Key: change-this-api-key' \
  -d '{"nome":"Fone Bluetooth","descricao":"Fone sem fio","preco":99.90,"categoria":"eletronicos","atributos":{"cor":"preto"},"imagemUrl":"https://example.com/fone.jpg","imagens":[],"estoqueInicial":12,"externalId":"fone-001","origem":"catalogo-demo"}'
```

`POST /products/bulk` recebe um array com o mesmo formato. Se o par `origem` + `externalId` existir, o produto é atualizado em vez de duplicado:

```sh
curl -X POST http://localhost:3000/products/bulk \
  -H 'Content-Type: application/json' -H 'X-API-Key: change-this-api-key' \
  -d '[{"nome":"Caneca","descricao":"Cerâmica","preco":25,"categoria":"casa","atributos":{"volume":"300ml"},"imagemUrl":"","imagens":[],"estoqueInicial":20,"externalId":"caneca-001","origem":"catalogo-demo"}]'
```

## Arquitetura

```text
React + TanStack Query --REST/cookie--> NestJS API
  Auth/sessão e carrinho ----------------> Redis
  Commands: PostgreSQL domínio + outbox (uma transação)
  Queries: MongoDB read models (sem JOIN)
  Outbox worker: SELECT ... FOR UPDATE SKIP LOCKED -> projeções Mongo idempotentes
```

O worker faz polling contínuo. Falhas incrementam `tentativas`; após cinco, o evento fica em `ERRO`. O checkout trava cada linha de estoque no PostgreSQL, valida disponibilidade e preço corrente e cria pedido, snapshots de itens, pagamento simulado aprovado e eventos na mesma transação. Depois do commit, tenta limpar o carrinho. Se Redis falhar nessa limpeza, o pedido continua válido e um erro é registrado; a tela apresenta o pedido retornado enquanto a projeção fica eventualmente consistente.

Rotas de catálogo e histórico leem MongoDB. A leitura histórica pode atrasar até alguns segundos. `/orders/:id` retorna 404 até a projeção aparecer. API documentada em `/docs`.

## Escopo e limitações atuais

Produtos são inseridos pela API (o catálogo não é pré-populado); `npm run seed:dev` fica reservado para dados de demonstração futuros. Pagamentos são simulados. O papel padrão de cadastro é `CONSUMIDOR`; papéis privilegiados são concedidos pelo administrador no banco. A tela de checkout usa endereço vazio quando não informado e PIX simulado como padrão.
