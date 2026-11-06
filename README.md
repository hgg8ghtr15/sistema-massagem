# Sistema de Agendamento de Massagem

Backend para gerenciamento de clínica de massagens: usuários, autenticação, catálogo de massagens, materiais e vínculos com massagistas.

---

## 📋 Sumário

- [Banco de Dados (PostgreSQL)](#banco-de-dados-postgresql)
- [Configuração do Projeto](#configuração-do-projeto)
- [Executando a Aplicação](#executando-a-aplicação)
- [Testes](#testes)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Recursos da API](#recursos-da-api)

---

## 🐘 Banco de Dados (PostgreSQL)

### Inicializar o banco de dados

```bash
docker compose up -d
```

### Testar a conexão

```bash
# Verificar se o container está rodando
docker ps

# Testar conexão via psql (dentro do container)
docker exec -it sistema-massagem-postgres psql -U postgres -d sistema_massagem -c "SELECT version();"

# Testar conexão via psql (do host)
psql -h localhost -U postgres -d sistema_massagem -c "SELECT version();"

# Verificar logs
docker logs sistema-massagem-postgres

# Parar o banco
docker compose down

# Parar e remover volumes (apaga os dados)
docker compose down -v
```

### Configuração de conexão

| Parâmetro | Valor |
|-----------|-------|
| Host | localhost |
| Porta | 5432 |
| Usuário | postgres |
| Senha | postgres123 |
| Database | sistema_massagem |

---

## ⚙️ Configuração do Projeto

```bash
$ npm install
```

### Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste se necessário:

```bash
cp .env.example .env
```

Principais variáveis:
- `DATABASE_URL` — string de conexão PostgreSQL
- `JWT_SECRET` — segredo para assinar tokens JWT
- `PORT` — porta do servidor (padrão: 3000)

---

## 🚀 Executando a Aplicação

```bash
# development
$ npm run start

# watch mode (recarrega ao salvar)
$ npm run start:dev

# production build
$ npm run build
$ npm run start:prod
```

A aplicação sobe em `http://localhost:3000/api` (prefixo global `/api`).

---

## 🧪 Testes

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

---

## 📖 Documentação da API (Swagger)

A documentação interativa está disponível em:

```
http://localhost:3000/docs
```

### Autenticação no Swagger

1. Faça login em `POST /api/auth/login` para obter o token JWT
2. Clique no botão **Authorize** (🔒) no topo da página
3. Cole o token no campo `Bearer <token>`
4. As rotas protegidas agora funcionarão

### Tags organizadas

| Tag | Descrição |
|-----|-----------|
| **Auth** | Login, logout, renovação de token |
| **Usuários** | Cadastro, listagem, alteração de perfil |
| **Massagens** | Catálogo de massagens, materiais, vínculos com massagistas |
| **Materiais** | Catálogo de materiais reutilizáveis |
| **Health** | Verificação de saúde da aplicação |

---

## 📚 Recursos da API

### Prefixo global
Todas as rotas estão sob `/api`.

### Autenticação (`/api/auth`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| `POST` | `/login` | Autentica usuário, retorna JWT | Público |
| `POST` | `/logout` | Revoga token atual | Autenticado |

### Usuários (`/api/usuarios`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| `POST` | `/register` | Cadastra cliente (perfil `CLIENTE`) | Público |
| `GET` | `/` | Lista usuários | `ADMIN` |
| `GET` | `/:id` | Busca usuário por ID | `ADMIN` |
| `PATCH` | `/:id/perfil` | Altera perfil do usuário | `ADMIN` |

**Perfis disponíveis:** `CLIENTE` (padrão), `ADMIN`, `ADMINISTRATIVO`, `MASSAGISTA`

> Para criar o primeiro `ADMIN`, atualize direto no banco:
> ```sql
> UPDATE "Usuario" SET "perfil" = 'ADMIN' WHERE "email" = 'seu@email.com';
> ```

### Massagens (`/api/massagens`)

Catálogo de tipos de massagem oferecidos pela clínica.

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| `POST` | `/` | Cadastrar massagem | `ADMIN` |
| `GET` | `/` | Listar massagens **ativas** | Autenticado |
| `GET` | `/:id` | Detalhes da massagem | Autenticado |
| `PATCH` | `/:id` | Atualizar dados da massagem | `ADMIN` |
| `PATCH` | `/:id/ativo` | Arquivar/reativar massagem | `ADMIN` |
| `PUT` | `/:id/materiais` | Substituir ficha de materiais | `ADMIN` |
| `PUT` | `/:id/massagistas/:usuarioId` | Vincular massagista | `ADMIN` |
| `DELETE` | `/:id/massagistas/:usuarioId` | Desvincular massagista | `ADMIN` |

#### DTO de criação (`POST /api/massagens`)
```json
{
  "nome": "Massagem relaxante",
  "descricao": "Técnica para relaxamento muscular.",
  "duracaoMinutos": 60,
  "valorCentavos": 15000,
  "youtubeUrl": "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
}
```
- `valorCentavos`: valor em centavos (ex: 15000 = R$ 150,00)
- `nome` único, 2–100 caracteres
- `duracaoMinutos` > 0
- `valorCentavos` ≥ 0
- `youtubeUrl` (opcional): link de vídeo do YouTube; aparece como miniatura no catálogo e como vídeo incorporado nos detalhes. Na edição, envie `null` ou uma string vazia para remover o vídeo.

#### Ficha de materiais (`PUT /api/massagens/:id/materiais`)
```json
{
  "materiais": [
    { "materialId": 1, "quantidade": 10, "unidade": "ml" },
    { "materialId": 2, "quantidade": 1, "unidade": "unidade" }
  ]
}
```
- Substitui a ficha completa (lista vazia = remove todos)
- Todos os materiais devem existir e estar ativos
- IDs não podem se repetir na mesma lista
- Operação atômica (transação)

#### Vínculo massagista (`PUT /api/massagens/:id/massagistas/:usuarioId`)
- Usuário deve ter perfil `MASSAGISTA`
- Massagem deve estar ativa
- Impede vínculos duplicados

---

### Materiais (`/api/materiais`)

Catálogo de materiais reutilizáveis (óleos, lençóis, pedras, etc.).

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| `POST` | `/` | Cadastrar material | `ADMIN` |
| `PATCH` | `/:id/ativo` | Arquivar/reativar material | `ADMIN` |

#### DTO de criação (`POST /api/materiais`)
```json
{
  "nome": "Óleo de amêndoas",
  "descricao": "Óleo vegetal para massagem."
}
```
- `nome` único, 2–100 caracteres
- `descricao` opcional, máx. 1000 caracteres

> Materiais arquivados (`ativo: false`) não podem ser adicionados a novas fichas.

---

### Health Check (`/api/health`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Status da aplicação |

---

## 🗄️ Modelo de Dados (Prisma)

Principais modelos:

```prisma
model Usuario {
  id                Int                 @id @default(autoincrement())
  email             String              @unique
  nome              String
  senha             String
  perfil            String              @default("CLIENTE")
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  agendamentos      Agendamento[]
  massagistaMassagens MassagistaMassagem[]
}

model Massagem {
  id              Int                 @id @default(autoincrement())
  nome            String              @unique
  descricao       String
  duracaoMinutos  Int
  valorCentavos   Int
  ativo           Boolean             @default(true)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  materiais       MassagemMaterial[]
  massagistas     MassagistaMassagem[]
  @@index([ativo])
}

model Material {
  id          Int                 @id @default(autoincrement())
  nome        String              @unique
  descricao   String?
  ativo       Boolean             @default(true)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  massagens   MassagemMaterial[]
  @@index([ativo])
}

model MassagemMaterial {
  massagemId  Int
  materialId  Int
  quantidade  Int
  unidade     String
  massagem    Massagem @relation(fields: [massagemId], references: [id], onDelete: Cascade)
  material    Material @relation(fields: [materialId], references: [id], onDelete: Restrict)
  @@id([massagemId, materialId])
  @@index([materialId])
}

model MassagistaMassagem {
  usuarioId   Int
  massagemId  Int
  usuario     Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  massagem    Massagem @relation(fields: [massagemId], references: [id], onDelete: Cascade)
  @@id([usuarioId, massagemId])
  @@index([massagemId])
}
```

### Regras de negócio implementadas

- **Arquivamento em vez de exclusão**: massagens e materiais usam `ativo: false` para manter histórico de agendamentos
- **Valores em centavos**: evita erros de ponto flutuante (R$ 150,00 = 15000)
- **Vínculo muitos-para-muitos**: massagista ↔ massagem via `MassagistaMassagem`
- **Ficha de materiais**: quantidade + unidade por massagem (ex: 10 ml, 1 unidade)
- **Apenas ADMIN gerencia catálogo**: criação, edição, arquivamento, vínculos
- **Massagista só atende massagens vinculadas**: verificado no servidor

---

## 🔧 Comandos Úteis (Prisma)

```bash
# Gerar contrato TypeScript após alterar schema.prisma
$ npm run prisma:emit

# Planejar migration
$ npx prisma migration plan --name nome-da-migration

# Ver SQL que será executado
$ npx prisma db migrate --show

# Aplicar migration
$ npx prisma db migrate --advance-ref db

# Status das migrations
$ npx prisma migration status

# Abrir Prisma Studio
$ npx prisma studio
```

> Migrations ficam em `migrations/app/` (não em `prisma/migrations/`).

---

## 📁 Estrutura do Projeto

```
src/
├── app.module.ts
├── main.ts
├── prisma/
│   └── db.ts              # Cliente Prisma (ORM Postgres)
├── auth/                  # Autenticação JWT
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/login.dto.ts
│   ├── guards/jwt-auth.guard.ts
│   └── strategies/jwt.strategy.ts
├── usuarios/              # Usuários e perfis
│   ├── usuarios.module.ts
│   ├── usuarios.controller.ts
│   ├── usuarios.service.ts
│   ├── dto/register.dto.ts
│   ├── dto/update-perfil.dto.ts
│   ├── perfil.enum.ts
│   └── guards/admin.guard.ts
├── massagens/             # Catálogo de massagens e materiais
│   ├── massagens.module.ts
│   ├── massagens.controller.ts
│   ├── massagens.service.ts
│   ├── materiais.controller.ts
│   └── dto/
│       ├── create-massagem.dto.ts
│       ├── update-massagem.dto.ts
│       ├── create-material.dto.ts
│       ├── update-ativo.dto.ts
│       └── update-materiais-massagem.dto.ts
└── health/                # Health check
    ├── health.module.ts
    ├── health.controller.ts
    └── health.service.ts
```

---

## ✅ Critérios de Qualidade

| Check | Comando | Status |
|-------|---------|--------|
| Build | `npm run build` | ✅ Passa |
| Lint | `npm run lint` | ✅ Passa (1 warning) |
| Testes unitários | `npm run test` | ⚠️ Sem testes para massagens |
| Testes e2e | `npm run test:e2e` | ✅ Passa |

> **Pendente**: Testes unitários para o módulo `massagens` (service + controllers).