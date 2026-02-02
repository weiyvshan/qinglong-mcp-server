/**
 * Qinglong MCP Server - Type Definitions
 */

// Response format enum
export enum ResponseFormat {
	MARKDOWN = "markdown",
	JSON = "json"
}

// ============================================================================
// 定时任务 (Crontab)
// ============================================================================

export interface Crontab {
	[key: string]: unknown;
	id?: number;
	name: string;
	command: string;
	schedule: string;
	timestamp?: string;
	saved?: boolean;
	status?: CrontabStatus;
	isSystem?: number;
	pid?: number;
	isDisabled?: number;
	log_path?: string;
	isPinned?: number;
	labels?: string[];
	last_running_time?: number;
	last_execution_time?: number;
	task_before?: string;
	task_after?: string;
	log_name?: string;
	allow_multiple_instances?: number;
	extra_schedules?: Array<{ schedule: string }>;
}

export enum CrontabStatus {
	IDLE = 0,
	RUNNING = 1,
	QUEUED = 2
}

// ============================================================================
// 环境变量 (Env)
// ============================================================================

export interface Env {
	[key: string]: unknown;
	id?: number;
	name: string;
	value: string;
	timestamp?: string;
	status?: EnvStatus;
	position?: number;
	remarks?: string;
	isPinned?: number;
}

export enum EnvStatus {
	NORMAL = 0,
	DISABLED = 1
}

// ============================================================================
// 订阅管理 (Subscription)
// ============================================================================

export interface Subscription {
	[key: string]: unknown;
	id?: number;
	name?: string;
	alias: string;
	type: string;
	url: string;
	branch?: string;
	whitelist?: string;
	blacklist?: string;
	dependences?: string;
	extensions?: string;
	schedule?: string;
	interval_schedule?: {
		type: string;
		value: number;
	};
	schedule_type: string;
	pull_type?: string;
	pull_option?: object;
	sub_before?: string;
	sub_after?: string;
	proxy?: string;
	autoAddCron?: boolean;
	autoDelCron?: boolean;
	isDisabled?: number;
	status?: SubscriptionStatus;
	pid?: number;
	log_path?: string;
	last_running_time?: number;
	last_execution_time?: number;
}

export enum SubscriptionStatus {
	IDLE = 0,
	RUNNING = 1,
	QUEUED = 2
}

// ============================================================================
// 脚本管理 (Script)
// ============================================================================

export interface Script {
	[key: string]: unknown;
	title: string;
	value: string;
	key?: string;
	isDir?: boolean;
	children?: Script[];
}

export interface ScriptDetail {
	filename: string;
	path?: string;
	content: string;
}

// ============================================================================
// 依赖管理 (Dependence)
// ============================================================================

export interface Dependence {
	[key: string]: unknown;
	id?: number;
	name: string;
	type: DependenceType;
	remark?: string;
	status?: DependenceStatus;
	log_path?: string;
	pid?: number;
}

export enum DependenceType {
	NODE_JS = 1,
	PYTHON3 = 2,
	LINUX = 3
}

export enum DependenceStatus {
	INSTALLING = 0,
	INSTALLED = 1,
	FAILED = 2,
	REMOVING = 3
}

// ============================================================================
// 配置文件 (Config)
// ============================================================================

export interface ConfigFile {
	[key: string]: unknown;
	title: string;
	value: string;
}

// ============================================================================
// 日志管理 (Log)
// ============================================================================

export interface Log {
	[key: string]: unknown;
	title: string;
	value: string;
	isDir?: boolean;
	children?: Log[];
}

// ============================================================================
// 系统设置 (System)
// ============================================================================

export interface SystemInfo {
	[key: string]: unknown;
	isInitialized: boolean;
	version: string;
	publishTime: number;
	branch: string;
	changeLog: string;
	changeLogLink: string;
}

export interface SystemConfig {
	logRemoveFrequency?: number | null;
	cronConcurrency?: number | null;
	dependenceProxy?: string | null;
	nodeMirror?: string | null;
	pythonMirror?: string | null;
	linuxMirror?: string | null;
}

export enum NotificationMode {
	GOTIFY = "gotify",
	GO_CQHTTP_BOT = "goCqHttpBot",
	SERVER_CHAN = "serverChan",
	PUSH_DEER = "pushDeer",
	BARK = "bark",
	CHAT = "chat",
	TELEGRAM_BOT = "telegramBot",
	DINGTALK_BOT = "dingtalkBot",
	WEWORK_BOT = "weWorkBot",
	WEWORK_APP = "weWorkApp",
	AIBOTK = "aibotk",
	IGOT = "iGot",
	PUSH_PLUS = "pushPlus",
	WE_PLUS_BOT = "wePlusBot",
	EMAIL = "email",
	PUSH_ME = "pushMe",
	FEISHU = "feishu",
	WEBHOOK = "webhook",
	CHRONOCAT = "chronocat",
	NTFY = "ntfy",
	WX_PUSHER_BOT = "wxPusherBot"
}

export interface NotificationInfo {
	type: NotificationMode;
	// Gotify
	gotifyUrl?: string;
	gotifyToken?: string;
	gotifyPriority?: number;
	// Go-CQHttp
	goCqHttpBotUrl?: string;
	goCqHttpBotToken?: string;
	goCqHttpBotQq?: string;
	// ServerChan
	serverChanKey?: string;
	// PushDeer
	pushDeerKey?: string;
	pushDeerUrl?: string;
	// Bark
	barkPush?: string;
	barkIcon?: string;
	barkSound?: string;
	barkGroup?: string;
	barkLevel?: string;
	barkUrl?: string;
	barkArchive?: string;
	// Telegram
	telegramBotToken?: string;
	telegramBotUserId?: string;
	telegramBotProxyHost?: string;
	telegramBotProxyPort?: string;
	telegramBotProxyAuth?: string;
	telegramBotApiHost?: string;
	// DingTalk
	dingtalkBotToken?: string;
	dingtalkBotSecret?: string;
	// WeWork
	weWorkBotKey?: string;
	weWorkOrigin?: string;
	weWorkAppKey?: string;
	// Aibotk
	aibotkKey?: string;
	aibotkType?: string;
	aibotkName?: string;
	// iGot
	iGotPushKey?: string;
	// PushPlus
	pushPlusToken?: string;
	pushPlusUser?: string;
	pushPlusTemplate?: string;
	pushplusChannel?: string;
	pushplusWebhook?: string;
	pushplusCallbackUrl?: string;
	pushplusTo?: string;
	// WePlusBot
	wePlusBotToken?: string;
	wePlusBotReceiver?: string;
	wePlusBotVersion?: string;
	// Email
	emailService?: string;
	emailUser?: string;
	emailPass?: string;
	emailTo?: string;
	// PushMe
	pushMeKey?: string;
	pushMeUrl?: string;
	// Feishu
	larkKey?: string;
	// Webhook
	webhookHeaders?: string;
	webhookBody?: string;
	webhookUrl?: string;
	webhookMethod?: string;
	webhookContentType?: string;
	// Chronocat
	chronocatURL?: string;
	chronocatQq?: string;
	chronocatToken?: string;
	// Ntfy
	ntfyUrl?: string;
	ntfyTopic?: string;
	ntfyPriority?: string;
	ntfyToken?: string;
	ntfyUsername?: string;
	ntfyPassword?: string;
	ntfyActions?: string;
	// WxPusher
	wxPusherBotAppToken?: string;
	wxPusherBotTopicIds?: string;
	wxPusherBotUids?: string;
}

// ============================================================================
// API 响应
// ============================================================================

export interface ApiResponse<T> {
	code: number;
	data?: T;
	message?: string;
	count?: number;
}
