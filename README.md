# sistema-massagem

Projeto para agendamento de Massagem - Backend e Frontend

---

## 📋 Sumário

- [Banco de Dados (PostgreSQL)](#banco-de-dados-postgresql)
- [Configuração do Projeto](#configuração-do-projeto)
- [Executando a Aplicação](#executando-a-aplicação)
- [Testes](#testes)
- [Deploy](#deploy)
- [Observabilidade](#observabilidade)
- [Recursos](#recursos)
- [Suporte](#suporte)
- [Licença](#licença)

---

## 🐘 Banco de Dados (PostgreSQL)

### Inicializar o banco de dados

```bash
docker compose up -d
```

### Testar a conexão com o banco de dados

```bash
# Verificar se o container está rodando
docker ps

# Testar conexão via psql (dentro do container)
docker exec -it sistema-massagem-postgres psql -U postgres -d sistema_massagem -c "SELECT version();"

# Testar conexão via psql (do host, se tiver psql instalado)
psql -h localhost -U postgres -d sistema_massagem -c "SELECT version();"

# Verificar logs do PostgreSQL
docker logs sistema-massagem-postgres

# Parar o banco de dados
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

## Usuários e perfis

- `POST /api/usuarios/register` cadastra um cliente com o perfil `CLIENTE`.
- `POST /api/auth/login` autentica um usuário.
- `POST /api/auth/logout` encerra a sessão e revoga o token JWT atual; envie o token no cabeçalho `Authorization: Bearer <token>`.
- `PATCH /api/usuarios/:id/perfil` altera o perfil e exige autenticação de um usuário `ADMIN`.

Os perfis disponíveis são `CLIENTE` (padrão), `ADMIN` (administração e atribuição de perfis), `ADMINISTRATIVO` (agendamentos, pagamentos e recebimentos) e `MASSAGISTA` (atendimentos e materiais da clínica). Cada usuário possui um perfil, alterável pelo administrador. O cadastro público não aceita perfil no corpo da requisição. Para definir o primeiro administrador, promova uma conta diretamente no banco de dados, por exemplo: `UPDATE "Usuario" SET "perfil" = 'ADMIN' WHERE "email" = 'email-da-conta';`. Após o logout, o token revogado não pode mais ser usado nas rotas protegidas; a sessão só pode ser retomada após novo login.

---

## 🚀 Executando a Aplicação

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

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

## 📦 Deploy

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

---

## 🔍 Observabilidade

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. To connect it, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It writes the app key and secret into `.env` and makes every `nest start` script (`start`, `start:dev`, `start:debug`) load it. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand: create an application and an API key at [observe.nestjs.com](https://observe.nestjs.com), and set the pair as `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment the app runs in.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

---

## 📚 Recursos

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

---

## 💬 Suporte

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

---

## 📞 Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

---

## 📄 Licença

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
