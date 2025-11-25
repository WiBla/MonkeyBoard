type LogLevelName = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL" | "SUCCESS";

const LEVELS: Record<LogLevelName, number> = {
	DEBUG: 10,
	INFO: 20,
	SUCCESS: 25,
	WARN: 30,
	ERROR: 40,
	FATAL: 50,
};

const DEFAULT_MAX_BYTES = 1_048_576;

const ANSI = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	DEBUG: "\x1b[95m", // bright magenta
	INFO: "\x1b[36m", // cyan
	SUCCESS: "\x1b[92m", // bright green
	WARN: "\x1b[33m", // yellow
	ERROR: "\x1b[31m", // red
	FATAL: "\x1b[35m", // magenta
	timestamp: "\x1b[90m", // bright black / dim
	name: "\x1b[94m", // bright blue
};

const encoder = new TextEncoder();

export interface LoggerOptions {
	name?: string;
	level?: LogLevelName;
	console?: boolean;
	file?: boolean;
	filePath?: string;
	maxBytes?: number;
	colors?: boolean;
	includeCaller?: boolean;
}

export type LogMeta = Record<string, unknown> | string | undefined;

interface QueueItem {
	text: string;
}

function formatTimestamp(date = new Date()): string {
	const pad = (n: number, width = 2) => n.toString().padStart(width, "0");
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hh = pad(date.getHours());
	const mm = pad(date.getMinutes());
	const ss = pad(date.getSeconds());
	const ms = date.getMilliseconds().toString().padStart(3, "0");
	return `${year}-${month}-${day} ${hh}:${mm}:${ss}.${ms}`;
}

function getCallerInfo(
	skipFrames = 3,
): { file?: string; line?: number; func?: string } {
	const err = new Error();
	const stack = err.stack;
	if (!stack) return {};
	const lines = stack.split("\n").map((l) => l.trim());
	// stack[0] = "Error"
	// lines[skipFrames] should correspond to caller
	// We iterate to find the first stack line that doesn't mention this file
	// Try to skip frames mentioning "deno_logger" or "deno:internal" etc
	const candidateLine = lines
		.slice(skipFrames)
		.find((l) =>
			!l.includes("deno_logger") && !l.includes("deno:internal") &&
			!l.includes("native")
		);
	const line = candidateLine ?? lines[skipFrames] ?? lines[lines.length - 1];
	// Typical V8 stack frames:
	// at functionName (file:///path/to/file.ts:12:34)
	// or at file:///path/to/file.ts:12:34
	const m = line.match(/at (.+?) \((.+):(\d+):(\d+)\)$/) ||
		line.match(/at (.+):(\d+):(\d+)$/);
	if (!m) return {};
	if (m.length === 5) {
		const func = m[1];
		const file = m[2];
		const lineNo = Number(m[3]);
		return { file, line: lineNo, func };
	} else if (m.length === 4) {
		const file = m[1];
		const lineNo = Number(m[2]);
		return { file, line: lineNo, func: undefined };
	}
	return {};
}

function renderMeta(meta?: LogMeta): string | undefined {
	if (meta === undefined) return undefined;
	if (typeof meta === "string") return meta;

	try {
		return JSON.stringify(meta);
	} catch {
		return String(meta);
	}
}

function colorFor(
	level: LogLevelName,
	colors: boolean,
): (text: string) => string {
	if (!colors) return (t: string) => t;
	const code = ANSI[level] ?? "";
	return (t: string) => `${code}${t}${ANSI.reset}`;
}

export class Logger {
	// #region Properties
	public readonly name: string;
	private levelValue: number;
	private readonly consoleEnabled: boolean;
	private fileEnabled: boolean;
	private filePath?: string;
	private fileHandle?: Deno.FsFile;
	private currentFileBytes = 0;
	private currentFileMonth = "";
	private readonly maxBytes: number;
	private readonly colors: boolean;
	private readonly includeCaller: boolean;
	private queue: QueueItem[] = [];
	private writerRunning = false;
	private writerAbort = false;
	// #endregion Properties

	constructor(opts: LoggerOptions = {}) {
		this.name = opts.name ?? "app";
		const lvl = opts.level ?? "INFO";
		this.levelValue = LEVELS[lvl];
		this.consoleEnabled = opts.console !== undefined ? opts.console : true;
		this.fileEnabled = opts.file !== undefined ? opts.file : true;
		this.filePath = opts.filePath;
		this.maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
		this.colors = opts.colors !== undefined ? opts.colors : true;
		this.includeCaller = opts.includeCaller !== undefined
			? opts.includeCaller
			: true;

		if (this.fileEnabled) {
			try {
				this.initFileWriter();
			} catch (err) {
				this.fileEnabled = false;
				console.warn("[Logger] File init failed, using console fallback:", err);
			}
		}
	}

	// #region Core methods (private)
	private log(
		level: LogLevelName,
		msg: string,
		meta?: LogMeta,
	): void {
		const levelNum = LEVELS[level];
		if (levelNum < this.levelValue) return;

		const now = new Date();
		const ts = formatTimestamp(now);
		const metaStr = renderMeta(meta);

		// Caller info
		let callerInfo = "";
		if (this.includeCaller) {
			const caller = getCallerInfo(4);
			if (caller.file) {
				const full = caller.file.replace("file://", "");
				// Keep only the filename + relative path from project root
				const filename = full.substring(full.lastIndexOf("/") + 1);
				callerInfo = ` ${filename}:${caller.line ?? "?"}${
					caller.func ? " " + caller.func : ""
				}`;
			}
		}

		// Stack trace for errors
		let stackBlock = "";
		if (
			(level === "ERROR" || level === "FATAL")
		) {
			if (meta && meta instanceof Error) {
				stackBlock = `\n${(meta as Error).stack ?? (meta as Error).message}`;
			} else if (
				meta && "stack" && typeof meta === "object" && "stack" in meta
			) {
				stackBlock = `\n${meta.stack}`;
			}
		}

		const base = `[${ts}]	[${level.padEnd(7)}]	[${this.name}]: ${msg}`;
		const metaSuffix = metaStr ? ` ${metaStr}` : "";
		const callerSuffix = callerInfo;
		const fullText = base + metaSuffix + callerSuffix + stackBlock + "\n";

		if (this.consoleEnabled) {
			try {
				this.consoleOutput(
					level,
					ts,
					msg,
					metaStr,
					stackBlock,
				);
			} catch {
				// ignore
			}
		}

		if (this.fileEnabled) {
			try {
				this.enqueueForFile(fullText);
			} catch (err) {
				console.error(
					"[Logger] Failed to enqueue log for file, fallback to console:",
					err,
				);
				console.error(fullText);
			}
		}
	}

	private consoleOutput(
		level: LogLevelName,
		ts: string,
		msg: string,
		metaStr: string | undefined,
		stackBlock: string,
	) {
		const colorize = colorFor(level, this.colors);
		const tsRendered = this.colors
			? `${ANSI.timestamp}[${ts}]${ANSI.reset}`
			: `[${ts}]`;
		const nameRendered = this.colors
			? `${ANSI.name}[${this.name}]${ANSI.reset}`
			: `[${this.name}]`;
		const levelRendered = colorize(`[${level.padEnd(7)}]`);
		const metaRendered = metaStr ? ` ${metaStr}` : "";
		const out =
			`${tsRendered} ${levelRendered} ${nameRendered}: ${msg}${metaRendered}`;

		switch (level) {
			case "ERROR":
			case "FATAL":
				console.error(out);
				if (stackBlock) console.error(stackBlock);
				break;

			case "WARN":
				console.warn(out);
				break;

			case "DEBUG":
				console.debug(out);
				break;

			default:
				console.log(out);
				break;
		}
	}

	// deno-lint-ignore require-await
	private async enqueueForFile(text: string): Promise<void> {
		this.queue.push({ text });

		if (!this.writerRunning) {
			this.writerRunning = true;
			this.writerAbort = false;
			this.runWriter().catch((e) => {
				console.error("[Logger] Background writer failed:", e);
				this.writerRunning = false;
				this.writerAbort = true;
			});
		}
	}

	private async initFileWriter(): Promise<void> {
		if (!this.fileEnabled) return;

		let finalPath = this.filePath ?? "./logs";
		try {
			const stat = await Deno.stat(finalPath).catch(() => null);

			if (stat && stat.isDirectory) {
				await Deno.mkdir(finalPath, { recursive: true }).catch(() => {});
				finalPath = `${finalPath}/.log`;
			} else {
				if (finalPath.endsWith("/") || finalPath.endsWith("\\")) {
					await Deno.mkdir(finalPath, { recursive: true }).catch(() => {});
					finalPath = `${finalPath}.log`;
				} else {
					const idx = finalPath.lastIndexOf("/");
					if (idx > 0) {
						const parent = finalPath.substring(0, idx);
						await Deno.mkdir(parent, { recursive: true }).catch(() => {});
					}
				}
			}
		} catch {
			// ignore
		}

		const now = new Date();
		const month = `${now.getFullYear()}-${
			String(now.getMonth() + 1).padStart(2, "0")
		}`;
		this.currentFileMonth = month;
		const pathWithMonth = appendMonthToFilename(finalPath, month);

		try {
			this.fileHandle = await Deno.open(pathWithMonth, {
				write: true,
				append: true,
				create: true,
			});
			const st = await this.fileHandle.stat();
			this.currentFileBytes = st.size;
			this.filePath = finalPath;
		} catch (err) {
			console.error(
				"[Logger] Could not open log file, disabling file logging:",
				err,
			);
			this.fileEnabled = false;
			this.fileHandle = undefined;
			throw err;
		}
	}

	private async runWriter(): Promise<void> {
		if (this.fileEnabled && !this.fileHandle) {
			try {
				await this.initFileWriter();
			} catch (err) {
				console.error(
					"[Logger] File writer init failed, fallback to console:",
					err,
				);
				this.fileEnabled = false;
			}
		}

		// Use local alias for performance
		const localFileEnabled = this.fileEnabled;
		while (!this.writerAbort && (this.queue.length > 0 || localFileEnabled)) {
			if (this.queue.length === 0) {
				await new Promise((res) => setTimeout(res, 50));

				if (this.queue.length === 0) {
					this.writerRunning = false;
					return;
				}
			}

			// Build a single chunk from queued items to reduce write calls
			let chunk = "";
			// cap per iteration to avoid huge memory usage
			const maxBatch = 100;
			let count = 0;
			while (this.queue.length > 0 && count < maxBatch) {
				const item = this.queue.shift()!;
				chunk += item.text;
				count++;
			}

			if (!chunk) continue;

			if (!this.fileEnabled || !this.fileHandle) {
				try {
					// Avoid expensive console for huge batches; write as single console.log
					console.log(chunk.trimEnd());
				} catch {
					// ignore
				}
				continue;
			}

			// Before writing, check rotation
			try {
				await this.rotateIfNeeded(chunk.length);
			} catch (err) {
				console.error(
					"[Logger] Rotation check failed, proceeding to attempt write:",
					err,
				);
			}

			try {
				// write to file
				const writeBytes = encoder.encode(chunk);
				await this.fileHandle.write(writeBytes);
				this.currentFileBytes += writeBytes.length;
			} catch (err) {
				console.error(
					"[Logger] File write failed, disabling file logging and fallback to console:",
					err,
				);
				this.fileEnabled = false;

				try {
					console.log(chunk.trimEnd());
				} catch {
					// ignore
				}
			}
		}

		this.writerRunning = false;
	}

	// deno-lint-ignore require-await
	private async rotateIfNeeded(pendingBytes: number): Promise<void> {
		if (!this.fileHandle || !this.filePath) return;

		const now = new Date();
		const month = `${now.getFullYear()}-${
			String(now.getMonth() + 1).padStart(2, "0")
		}`;

		// Monthly rotation
		if (month !== this.currentFileMonth) {
			try {
				this.rotateFile();
			} catch (err) {
				console.error("[Logger] monthly rotate failed:", err);
			}
			this.currentFileMonth = month;
		}

		// Size rotation
		if (
			this.maxBytes > 0 && this.currentFileBytes + pendingBytes > this.maxBytes
		) {
			try {
				this.rotateFile();
			} catch (err) {
				console.error("[Logger] size rotate failed:", err);
			}
		}
	}

	private async rotateFile(): Promise<void> {
		if (!this.fileHandle || !this.filePath) return;

		try {
			this.fileHandle.close();

			const now = new Date();
			const month = `${now.getFullYear()}-${
				String(now.getMonth() + 1).padStart(2, "0")
			}`;
			const newActivePath = appendMonthToFilename(this.filePath, month);
			this.fileHandle = await Deno.open(newActivePath, {
				write: true,
				append: true,
				create: true,
			});
			const st = await this.fileHandle.stat();
			this.currentFileBytes = st.size;
			this.currentFileMonth = month;
		} catch (err) {
			throw err;
		}
	}
	// #endregion Core methods (private)

	// #region Public methods
	public debug(msg: string, meta?: LogMeta) {
		this.log("DEBUG", msg, meta);
	}

	public info(msg: string, meta?: LogMeta) {
		this.log("INFO", msg, meta);
	}

	public success(msg: string, meta?: LogMeta) {
		this.log("SUCCESS", msg, meta);
	}

	public warn(msg: string, meta?: LogMeta) {
		this.log("WARN", msg, meta);
	}

	public error(msg: string, meta?: LogMeta) {
		this.log("ERROR", msg, meta);
	}

	public fatal(msg: string, meta?: LogMeta) {
		this.log("FATAL", msg, meta);
	}

	public setLevel(level: LogLevelName) {
		this.levelValue = LEVELS[level];
	}
	// #endregion Public methods
}

function appendMonthToFilename(path: string, month: string): string {
	const idx = path.lastIndexOf("/");
	const dir = idx >= 0 ? path.substring(0, idx + 1) : "";
	const filename = idx >= 0 ? path.substring(idx + 1) : path;
	const dot = filename.lastIndexOf(".");

	if (dot > 0) {
		const name = filename.substring(0, dot);
		const ext = filename.substring(dot + 1);
		return `${dir}${name}.${month}.${ext}`;
	} else {
		return `${dir}${filename}.${month}.log`;
	}
}

export default Logger;
