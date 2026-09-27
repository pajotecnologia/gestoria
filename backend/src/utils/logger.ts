type LogLevel = 'info' | 'warn' | 'error';

const write = (level: LogLevel, event: string, context: Record<string, unknown> = {}) => {
  const entry = { timestamp: new Date().toISOString(), level, event, ...context };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
};

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => write('info', event, context),
  warn: (event: string, context?: Record<string, unknown>) => write('warn', event, context),
  error: (event: string, context?: Record<string, unknown>) => write('error', event, context),
};