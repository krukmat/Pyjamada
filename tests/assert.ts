export function equal<T>(actual:T, expected:T, message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
export function deepEqual(actual:unknown, expected:unknown, message:string){const a=JSON.stringify(actual),e=JSON.stringify(expected);if(a!==e)throw new Error(`${message}: expected ${e}, got ${a}`)}
export async function test(name:string, fn:()=>Promise<void>|void){try{await fn();console.log(`PASS ${name}`)}catch(error){console.error(`FAIL ${name}`);throw error}}
