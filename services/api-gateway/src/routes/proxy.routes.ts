import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import axios, { type AxiosRequestConfig } from 'axios';
import { AppError } from '@ai-platform/types';
import { SERVICE_URLS } from '@ai-platform/config';
import { requireAuth } from '../middleware/auth.js';

// ─── Standard proxy (buffered) ────────────────────────────────────────────────

async function proxyRequest(req: Request, res: Response, targetUrl: string): Promise<void> {
  const config: AxiosRequestConfig = {
    method: req.method as AxiosRequestConfig['method'],
    url: targetUrl,
    data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    headers: {
      ...req.headers,
      host: new URL(targetUrl).host,
      'x-request-id': res.locals['requestId'] as string,
      'x-forwarded-for': req.ip ?? '',
    },
    params: req.query,
    validateStatus: () => true,
    maxRedirects: 0,
    withCredentials: true,
  };

  const upstream = await axios(config);

  if (upstream.headers['set-cookie']) {
    res.setHeader('set-cookie', upstream.headers['set-cookie']);
  }

  if (upstream.status >= 300 && upstream.status < 400 && upstream.headers['location']) {
    res.redirect(upstream.status, upstream.headers['location'] as string);
    return;
  }

  res.status(upstream.status).json(upstream.data);
}

function proxyTo(getServiceUrl: () => string, stripPrefix?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const path = stripPrefix ? req.path.replace(stripPrefix, '') || '/' : req.path;
      const targetUrl = `${getServiceUrl()}${req.baseUrl}${path}`;
      await proxyRequest(req, res, targetUrl);
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        next(new AppError('PROVIDER_UNAVAILABLE', 'Upstream service unavailable', 503));
      } else {
        next(err);
      }
    }
  };
}

// ─── SSE streaming proxy ──────────────────────────────────────────────────────
// axios buffers the full response — SSE requires streaming, so we use the raw
// Node http module and pipe the upstream response directly to the client.

function proxySSE(getServiceUrl: () => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const targetUrl = `${getServiceUrl()}${req.baseUrl}${req.path}`;

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      next(new AppError('INTERNAL_ERROR', 'Invalid upstream URL', 500));
      return;
    }

    const transport = parsed.protocol === 'https:' ? https : http;

    // Remove the query-param token before forwarding — x-user-id is already injected
    const forwardParams = new URLSearchParams(req.query as Record<string, string>);
    forwardParams.delete('token');
    const search = forwardParams.toString();
    const upstreamPath = `${parsed.pathname}${search ? `?${search}` : ''}`;

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: upstreamPath,
      method: 'GET',
      headers: {
        ...req.headers,
        host: parsed.host,
        'x-request-id': (res.locals['requestId'] as string) ?? '',
        'x-forwarded-for': req.ip ?? '',
        // Remove auth header — gateway already validated it and injected x-user-id
        authorization: '',
      },
    };

    const upstreamReq = transport.request(options, (upstreamRes) => {
      // Pass status + headers straight through
      res.writeHead(upstreamRes.statusCode ?? 200, upstreamRes.headers);
      upstreamRes.pipe(res, { end: true });

      // Clean up if the browser disconnects
      req.on('close', () => {
        upstreamRes.destroy();
        upstreamReq.destroy();
      });
    });

    upstreamReq.on('error', (err) => {
      if (!res.headersSent) {
        next(new AppError('PROVIDER_UNAVAILABLE', 'Upstream SSE unavailable', 503));
      } else {
        res.end();
      }
      void err;
    });

    upstreamReq.end();
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const proxyRouter = Router();

// /me needs JWT validation so the gateway can inject x-user-id
proxyRouter.get('/v1/auth/me', requireAuth, proxyTo(SERVICE_URLS.AUTH));

// All other auth routes — no JWT required (login, register, refresh, logout, public-key)
proxyRouter.use('/v1/auth', proxyTo(SERVICE_URLS.AUTH));

// User routes — JWT required
proxyRouter.use('/v1/users', requireAuth, proxyTo(SERVICE_URLS.USER));

// SSE job events — streaming proxy (must be before the catch-all image route)
proxyRouter.get('/v1/images/jobs/:jobId/events', requireAuth, proxySSE(SERVICE_URLS.IMAGE));

// Image routes — JWT required (buffered proxy)
proxyRouter.use('/v1/images', requireAuth, proxyTo(SERVICE_URLS.IMAGE));
