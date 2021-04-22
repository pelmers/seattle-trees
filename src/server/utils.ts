import path from 'path';
import readline from 'readline';

const repoRoot = path.resolve(__filename, '../..');
export const r = (relative: string) => path.resolve(repoRoot, relative);
const useDebug = process.argv.indexOf('--debug') >= 0;

export const d = useDebug
    ? (...args: unknown[]) => console.log(...args)
    : (..._unused: unknown[]) => {};

export async function time<T>(message: string, promise: Promise<T>): Promise<T> {
    const start = Date.now();
    try {
        const res = await promise;
        console.info(`${message}: ${(Date.now() - start).toFixed(2)}ms`);
        return res;
    } catch (err) {
        console.error(
            `${message} failed with ${err.toString()}: ${(Date.now() - start).toFixed(
                2
            )}ms`
        );
        throw err;
    }
}

export async function question(msg: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const answer = await new Promise<string>((resolve) => rl.question(msg, resolve));
    rl.close();
    return answer;
}
