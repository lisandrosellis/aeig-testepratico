# Teste Prático AEIG — API de Cobrança

Mini-API REST desenvolvida em TypeScript, Node.js, Express e SQLite para cadastro de associados, emissão de cobranças e confirmação de pagamentos via webhook.

## Requisitos

- Node.js 20 ou superior
- npm

## Como executar

```bash
npm install
npm run dev
```

A API ficará disponível em `http://localhost:3000`. O banco SQLite `aeig.db` é criado automaticamente na primeira execução.

Para compilar e executar:

```bash
npm run build
npm start
```

Para executar os testes automatizados:

```bash
npm test
```

## Endpoints

### 1. Cadastrar associado — `POST /associados`

```bash
curl -X POST http://localhost:3000/associados \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria da Silva","cpf":"529.982.247-25","valor_mensalidade":189.90}'
```

O CPF é normalizado para dígitos e validado pelos dois dígitos verificadores. CPF duplicado retorna HTTP 409.

### 2. Gerar cobrança — `POST /cobrancas`

Use o `id` retornado no cadastro:

```bash
curl -X POST http://localhost:3000/cobrancas \
  -H "Content-Type: application/json" \
  -d '{"associado_id":1,"mes_referencia":"2026-10"}'
```

O `nosso_numero` é gerado com identificador aleatório, e a cobrança começa como `PENDENTE`. Uma restrição única no banco impede mais de uma cobrança do mesmo associado no mesmo mês.

### 3. Consultar cobrança — `GET /cobrancas/:nosso_numero`

```bash
curl http://localhost:3000/cobrancas/COLE_O_NOSSO_NUMERO
```

### 4. Confirmar pagamento — `POST /webhooks/pagamento`

```bash
curl -X POST http://localhost:3000/webhooks/pagamento \
  -H "Content-Type: application/json" \
  -d '{"id_evento":"evt_000123","nosso_numero":"COLE_O_NOSSO_NUMERO","data_pagamento":"2026-10-15"}'
```

O evento é registrado em tabela com `id_evento` como chave primária. Reenvios do mesmo evento não repetem o processamento. Um número de cobrança inexistente retorna HTTP 404 sem derrubar a aplicação.

## Decisões técnicas

- **SQLite:** reduz a configuração necessária para executar o teste e mantém os dados entre reinicializações.
- **Valores monetários:** são armazenados como inteiros em centavos para evitar imprecisão de ponto flutuante no banco.
- **Restrições no banco:** CPF, nosso número e combinação associado/mês são únicos também no nível do SQLite, protegendo contra duplicidade mesmo em requisições concorrentes.
- **Webhook idempotente:** o identificador do evento é persistido em uma tabela própria; a gravação do evento e a atualização da cobrança ocorrem em transação.
- **Datas:** são recebidas no padrão `AAAA-MM-DD` e validadas como datas reais.
- **Erros HTTP:** 400 para dados inválidos, 404 para registros inexistentes, 409 para duplicidades e 500 para falhas inesperadas.

## O que ficou faltando / limitações

- A autenticação por assinatura HMAC-SHA256 do webhook foi deixada como bônus não implementado. O enunciado permite priorizar a API funcional.
- Não foi implementada autenticação de usuários, pois o enunciado informa que não é necessária.
- O projeto usa SQLite local; em produção, seria necessário configurar backup, observabilidade, gestão de segredos e uma estratégia de banco adequada ao ambiente.
- Os testes automatizados cobrem a regra de cálculo de juros e multa. Os endpoints podem receber uma suíte de integração adicional.

## Uso de IA

A IA foi utilizada como apoio à estruturação do projeto, revisão da lógica de validação e elaboração da documentação. As decisões e o funcionamento do código devem ser revisados e compreendidos pelo candidato antes da apresentação.

## Parte B

A análise dos defeitos, a função corrigida e os quatro valores pedidos estão em [`BUGS.md`](./BUGS.md).

## Roteiro sugerido para apresentação

1. Iniciar a API e mostrar `GET /health`.
2. Cadastrar um associado e demonstrar a validação de CPF.
3. Gerar uma cobrança e tentar gerar outra para o mesmo mês (HTTP 409).
4. Consultar a cobrança pelo nosso número.
5. Enviar o webhook duas vezes com o mesmo `id_evento` e demonstrar a idempotência.
6. Explicar as restrições do banco, a transação e a função de cálculo em `BUGS.md`.
