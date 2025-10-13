/**
 * Logger Utility
 * Provides logging functionality for the BTC data pipeline
 * Logs to both console and file
 */

import { promises as fs } from 'fs'
import path from 'path'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: any
}

class Logger {
  private logDir: string
  private logFile: string

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs')
    this.logFile = path.join(this.logDir, 'btc-data-pipeline.log')
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDir(): Promise<void> {
    try {
      await fs.access(this.logDir)
    } catch {
      await fs.mkdir(this.logDir, { recursive: true })
    }
  }

  /**
   * Write log entry to file
   */
  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      await this.ensureLogDir()
      
      const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}${
        entry.data ? ' ' + JSON.stringify(entry.data) : ''
      }\n`

      await fs.appendFile(this.logFile, logLine, 'utf-8')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  /**
   * Log message
   */
  private async log(level: LogLevel, module: string, message: string, data?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data
    }

    // Console output
    const consoleMessage = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}] ${message}`
    
    switch (level) {
      case 'error':
        console.error(consoleMessage, data || '')
        break
      case 'warn':
        console.warn(consoleMessage, data || '')
        break
      case 'debug':
        console.debug(consoleMessage, data || '')
        break
      default:
        console.log(consoleMessage, data || '')
    }

    // File output (async, don't wait)
    this.writeToFile(entry).catch(err => {
      console.error('Logger write error:', err)
    })
  }

  /**
   * Log info message
   */
  async info(module: string, message: string, data?: any): Promise<void> {
    await this.log('info', module, message, data)
  }

  /**
   * Log warning message
   */
  async warn(module: string, message: string, data?: any): Promise<void> {
    await this.log('warn', module, message, data)
  }

  /**
   * Log error message
   */
  async error(module: string, message: string, data?: any): Promise<void> {
    await this.log('error', module, message, data)
  }

  /**
   * Log debug message
   */
  async debug(module: string, message: string, data?: any): Promise<void> {
    await this.log('debug', module, message, data)
  }

  /**
   * Read recent log entries
   */
  async getRecentLogs(lines: number = 100): Promise<string> {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8')
      const allLines = content.trim().split('\n')
      const recentLines = allLines.slice(-lines)
      return recentLines.join('\n')
    } catch (error) {
      return 'No logs available'
    }
  }

  /**
   * Clear log file
   */
  async clearLogs(): Promise<void> {
    try {
      await fs.writeFile(this.logFile, '', 'utf-8')
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  /**
   * Rotate log file (keep last N lines)
   */
  async rotateLogs(keepLines: number = 10000): Promise<void> {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8')
      const lines = content.trim().split('\n')
      
      if (lines.length > keepLines) {
        const rotatedContent = lines.slice(-keepLines).join('\n') + '\n'
        await fs.writeFile(this.logFile, rotatedContent, 'utf-8')
        console.log(`[Logger] Rotated log file, kept ${keepLines} lines`)
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error)
    }
  }
}

// Singleton instance
export const logger = new Logger()

// Convenience functions
export const logInfo = (module: string, message: string, data?: any) => 
  logger.info(module, message, data)

export const logWarn = (module: string, message: string, data?: any) => 
  logger.warn(module, message, data)

export const logError = (module: string, message: string, data?: any) => 
  logger.error(module, message, data)

export const logDebug = (module: string, message: string, data?: any) => 
  logger.debug(module, message, data)

