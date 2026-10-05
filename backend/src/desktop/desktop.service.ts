import { exec } from 'child_process';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class DesktopService {
  /**
   * Brings the AI Assistant web window to the foreground on Windows.
   * Works even if the user is in VS Code, YouTube, Chrome, Word, Desktop, etc.
   */
  public async bringToForeground(): Promise<boolean> {
    if (process.platform !== 'win32') {
      logger.debug('[DesktopService] Non-windows platform, skipping OS window focus.');
      return false;
    }

    return new Promise((resolve) => {
      // PowerShell script to search for windows titled "AI Assistant" and activate them
      const psScript = `
        $wshell = New-Object -ComObject Wscript.Shell
        $activated = $false

        # Attempt to activate by window title
        $targets = @("AI Assistant", "Dashboard - AI Assistant", "localhost:3000", "localhost:3001", "localhost:3002")
        foreach ($title in $targets) {
          if ($wshell.AppActivate($title)) {
            $activated = $true
            break
          }
        }

        if (-not $activated) {
          # Fallback: check Chrome, Edge, Brave processes with web title
          $procs = Get-Process | Where-Object { $_.MainWindowTitle -match "AI Assistant|Assistant" }
          foreach ($p in $procs) {
            if ($wshell.AppActivate($p.Id)) {
              $activated = $true
              break
            }
          }
        }

        Write-Output $activated
      `;

      const command = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript.replace(/\r?\n/g, ' ')}"`;

      exec(command, { timeout: 3000 }, (error, stdout) => {
        if (error) {
          logger.warn('[DesktopService] Window focus command failed:', error.message);
          resolve(false);
        } else {
          const success = stdout.trim().toLowerCase() === 'true';
          logger.info(`[DesktopService] Window foreground activation: ${success ? 'SUCCESS' : 'Window not found / already active'}`);
          resolve(success);
        }
      });
    });
  }

  /**
   * Launches or opens the Assistant URL in default browser if needed
   */
  public openAssistantUrl(): void {
    const url = env.CLIENT_URLS[0] || 'http://localhost:3000';
    if (process.platform === 'win32') {
      exec(`start ${url}`);
    }
  }
}

export const desktopService = new DesktopService();
