/** Packs .cache/claude into eval/cache/responses.jsonl.gz, the recording `pnpm eval:offline` replays. */
import { packCache, RECORDED } from "./file-cache.js";

console.log(`${packCache()} responses -> ${RECORDED}`);
