import os from 'os';

/** Real values from the machine running the backend. No mocking. */
export class SystemService {
  info() {
    const cpus = os.cpus();
    return {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptimeSeconds: Math.round(os.uptime()),
      totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
      cpuModel: cpus[0]?.model?.trim() ?? 'unknown',
      cpuCount: cpus.length,
      loadAverage: os.loadavg().map((n) => Number(n.toFixed(2))),
      serverTime: new Date().toISOString(),
    };
  }

  /** One-sentence spoken summary, used as a command result. */
  spokenSummary(): string {
    const i = this.info();
    const usedPct = Math.round(((i.totalMemoryMb - i.freeMemoryMb) / i.totalMemoryMb) * 100);
    return `System ${i.platform} ${i.release}, ${i.cpuCount} CPU cores, ${usedPct} percent memory in use, up for ${Math.floor(
      i.uptimeSeconds / 60
    )} minutes.`;
  }

  localTime(): string {
    const now = new Date();
    return now.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}

export const systemService = new SystemService();