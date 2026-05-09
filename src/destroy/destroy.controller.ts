import { Controller, Post, Headers, Res, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Hardcoded destroy secret — pass this in the x-destroy-token header
const DESTROY_SECRET = 'IDH@destroy#2025!xK9mQ';

@Controller('destroy')
export class DestroyController {
  constructor(private readonly config: ConfigService) {}

  /**
   * POST /destroy
   *
   * Requires header:  x-destroy-token: IDH@destroy#2025!xK9mQ
   *
   * 1. Validates the secret token.
   * 2. Sends 200 immediately so the HTTP response completes before the
   *    process is killed.
   * 3. Fires a detached shell script that:
   *    – Deletes all PM2 processes and kills the PM2 daemon
   *    – Removes Nginx site configs and stops Nginx
   *    – Removes SSL / Let's Encrypt certificates
   *    – Removes the entire project / deploy directory
   *    – Removes .env files from the home directory
   *    – Clears the home directory contents
   */
  @Post()
  async destroy(
    @Headers('x-destroy-token') token: string,
    @Res() res: Response,
  ) {
    if (!token || token !== DESTROY_SECRET) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ error: 'Invalid or missing x-destroy-token header.' });
    }

    // ── Respond FIRST, then destroy ──────────────────────────────────────────
    res.status(HttpStatus.OK).json({
      message: 'Destroy sequence initiated. Instance will be wiped.',
      timestamp: new Date().toISOString(),
    });

    // Give the HTTP response 500 ms to flush before we start killing things
    setTimeout(() => this.runDestroy(), 500);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private runDestroy(): void {
    // Root of the deployed project – defaults to three levels up from dist/destroy/
    // Override on the server via env:  DEPLOY_ROOT=/home/ubuntu/nest-hello-app
    const deployRoot =
      this.config.get<string>('DEPLOY_ROOT') ||
      path.resolve(__dirname, '..', '..', '..'); // nest-hello-app root

    const homeDir = os.homedir(); // e.g. /home/ubuntu

    // Write a standalone shell script into /tmp so it can keep running
    // even after the Node / PM2 process is killed mid-way.
    const scriptPath = path.join(os.tmpdir(), '_destroy.sh');

    const script = [
      '#!/bin/bash',
      '',
      'echo "[destroy] Starting wipe sequence at $(date)"',
      '',
      '# 1. Stop + delete all PM2 processes and kill daemon',
      'echo "[destroy] Stopping PM2..."',
      'pm2 delete all 2>/dev/null || true',
      'pm2 kill       2>/dev/null || true',
      '',
      '# 2. Remove Nginx site configs and stop Nginx',
      'echo "[destroy] Removing Nginx configs..."',
      'sudo rm -f /etc/nginx/sites-enabled/*  2>/dev/null || true',
      'sudo rm -f /etc/nginx/sites-available/* 2>/dev/null || true',
      'sudo systemctl stop nginx 2>/dev/null || true',
      '',
      '# 3. Remove SSL / Let\'s Encrypt certificates',
      'echo "[destroy] Removing SSL certs..."',
      'sudo rm -rf /etc/letsencrypt      2>/dev/null || true',
      'sudo rm -rf /var/lib/letsencrypt  2>/dev/null || true',
      'sudo rm -rf /var/log/letsencrypt  2>/dev/null || true',
      '',
      `# 4. Remove the deployed project directory`,
      `echo "[destroy] Removing project at ${deployRoot}..."`,
      `rm -rf "${deployRoot}" 2>/dev/null || true`,
      '',
      `# 5. Remove all .env files in home directory`,
      `echo "[destroy] Removing .env files from ${homeDir}..."`,
      `find "${homeDir}" \\( -name ".env" -o -name ".env.*" \\) -delete 2>/dev/null || true`,
      '',
      `# 6. Remove PM2 config / saved process list`,
      `echo "[destroy] Removing PM2 config..."`,
      `rm -rf "${homeDir}/.pm2" 2>/dev/null || true`,
      '',
      `# 7. Clear entire home directory (project files, configs, etc.)`,
      `echo "[destroy] Clearing home directory ${homeDir}..."`,
      `find "${homeDir}" -mindepth 1 -maxdepth 1 ! -name "_destroy.sh" -exec rm -rf {} + 2>/dev/null || true`,
      '',
      'echo "[destroy] Wipe complete at $(date)"',
    ].join('\n');

    fs.writeFileSync(scriptPath, script, { mode: 0o755 });

    // spawn with detached:true so the child process is in its own process group
    // and survives the parent Node process being killed by PM2 cleanup.
    const child = spawn('bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }
}
