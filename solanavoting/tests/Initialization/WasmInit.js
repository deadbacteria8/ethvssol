
import initWasm from "../../wasm/pkg/wasm.js";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function loadWasm() {
    const wasmPath = join(__dirname, "../../wasm/pkg/wasm_bg.wasm");
    const wasmBuffer = await readFile(wasmPath);
    await initWasm(wasmBuffer);
}
