import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import axios, { type AxiosRequestConfig } from 'axios';
import { AppError } from '@ai-platform/types';
import { SERVICE_URLS } from '@ai-platform/config';
import { requireAuth } from '../middleware/auth.js';

// ─── Proxy helper ─────────────────────────────────────────────────────────────

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
    // Don't throw on 4xx/5xx — pass them through
    validateStatus: () => true,
    // Don't follow redirects — pass 3xx responses (e.g. OAuth) straight to the browser
    maxRedirects: 0,
    // Forward cookies for refresh token handling
    withCredentials: true,
  };

  const upstream = await axios(config);

  // Forward Set-Cookie headers (refresh token rotation)
  if (upstream.headers['set-cookie']) {
    res.setHeader('set-cookie', upstream.headers['set-cookie']);
  }

  // Forward redirects (OAuth flows) — don't JSON-encode them
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

// ─── Router ───────────────────────────────────────────────────────────────────

export const proxyRouter = Router();

// /me needs JWT validation so the gateway can inject x-user-id
proxyRouter.get('/v1/auth/me', requireAuth, proxyTo(SERVICE_URLS.AUTH));

// All other auth routes — no JWT required (login, register, refresh, logout, public-key)
proxyRouter.use('/v1/auth', proxyTo(SERVICE_URLS.AUTH));

// User routes — JWT required
proxyRouter.use('/v1/users', requireAuth, proxyTo(SERVICE_URLS.USER));

// Image routes — JWT required
proxyRouter.use('/v1/images', requireAuth, proxyTo(SERVICE_URLS.IMAGE));
