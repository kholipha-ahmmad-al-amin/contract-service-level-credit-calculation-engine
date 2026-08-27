import { resolve } from 'node:path';
import { createApp } from './app.mjs';
import { ContractServiceCreditService } from './domain.mjs';
import { AtomicStore } from './store.mjs';
const port = Number(process.env.PORT ?? '65073');
if (!Number.isInteger(port) || port < 1024 || port > 65535) { console.error('PORT must be an integer from 1024 through 65535'); process.exit(1); }
const service = new ContractServiceCreditService(new AtomicStore(resolve('data/credit-claims.json')));
const server = createApp(service).listen(port, '0.0.0.0', () => console.log(`contract service-level credit calculation engine listening on 0.0.0.0:${port}`));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
