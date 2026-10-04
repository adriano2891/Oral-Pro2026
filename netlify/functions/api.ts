import { INITIAL_SLOTS, INITIAL_CUSTOM_SECTIONS, INITIAL_MEDIA_LIBRARY, INITIAL_AUDIT_LOGS, INITIAL_LAST_PUBLISHED } from '../../src/data/initialSiteContent';

// In-memory state for Netlify serverless container lifetime
let serverState = {
  slots: [...INITIAL_SLOTS],
  customSections: [...INITIAL_CUSTOM_SECTIONS],
  mediaLibrary: [...INITIAL_MEDIA_LIBRARY],
  auditLogs: [...INITIAL_AUDIT_LOGS],
  lastPublished: INITIAL_LAST_PUBLISHED,
  hasUnpublished: false,
};

const ADMIN_CREDENTIALS = {
  email: 'admin@oralpro.it',
  password: 'oralpro2026!',
  user: {
    id: 'usr_admin_01',
    name: 'Administrador OralPro Italia',
    email: 'admin@oralpro.it',
    role: 'superadmin' as const,
  },
};

function jsonResponse(statusCode: number, data: any) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(data),
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  // Normalize path
  // The path could be "/.netlify/functions/api/site-content" or "/api/site-content"
  let subPath = event.path || '';
  subPath = subPath.replace(/^.*\/api\/?/, '');
  subPath = subPath.replace(/^\/+|\/+$/g, '');

  let body: any = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      body = {};
    }
  }

  // 1. Admin Authentication
  if (subPath === 'admin/login' && event.httpMethod === 'POST') {
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const cleanPass = (body.password || '').trim();

    const isEmailValid =
      cleanEmail === 'admin@oralpro.it' ||
      cleanEmail === 'admin' ||
      cleanEmail === 'admin@oralpro.com';

    const isPasswordValid =
      cleanPass === 'oralpro2026!' ||
      cleanPass === 'oralpro2026' ||
      cleanPass === 'Final2026' ||
      cleanPass === 'final2026' ||
      cleanPass === 'Final2026!';

    if (isEmailValid && isPasswordValid) {
      const token = 'oralpro_sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      return jsonResponse(200, {
        success: true,
        message: 'Autenticação bem-sucedida.',
        token,
        user: ADMIN_CREDENTIALS.user,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }

    return jsonResponse(401, {
      success: false,
      error: 'Credenciais inválidas. Verifique o email/utilizador e a palavra-passe.',
    });
  }

  if (subPath === 'admin/session' && event.httpMethod === 'GET') {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return jsonResponse(200, {
        success: true,
        authenticated: true,
        user: ADMIN_CREDENTIALS.user,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }
    return jsonResponse(401, {
      success: false,
      authenticated: false,
      error: 'Sessão inválida ou expirada.',
    });
  }

  if (subPath === 'admin/logout') {
    return jsonResponse(200, { success: true, message: 'Sessão terminada.' });
  }

  // 2. CMS Site Content Endpoints
  if (subPath === 'site-content' && event.httpMethod === 'GET') {
    const hasUnpublished = serverState.slots.some((s) => s.hasChanges);
    return jsonResponse(200, {
      success: true,
      data: {
        ...serverState,
        hasUnpublished,
      },
    });
  }

  if (subPath === 'site-content/slot' && event.httpMethod === 'POST') {
    const { key, updates } = body;
    const slotIndex = serverState.slots.findIndex((s) => s.key === key);
    if (slotIndex >= 0) {
      const current = serverState.slots[slotIndex];
      serverState.slots[slotIndex] = {
        ...current,
        draftImageUrl: updates.draftImageUrl !== undefined ? updates.draftImageUrl : current.draftImageUrl,
        draftAltText: updates.draftAltText !== undefined ? updates.draftAltText : current.draftAltText,
        draftAspectRatio: updates.draftAspectRatio !== undefined ? updates.draftAspectRatio : current.draftAspectRatio,
        draftFit: updates.draftFit !== undefined ? updates.draftFit : current.draftFit,
        draftPosition: updates.draftPosition !== undefined ? updates.draftPosition : current.draftPosition,
        draftTitle: updates.draftTitle !== undefined ? updates.draftTitle : current.draftTitle,
        draftSubtitle: updates.draftSubtitle !== undefined ? updates.draftSubtitle : current.draftSubtitle,
        draftText: updates.draftText !== undefined ? updates.draftText : current.draftText,
        draftCtaText: updates.draftCtaText !== undefined ? updates.draftCtaText : current.draftCtaText,
        draftCtaLink: updates.draftCtaLink !== undefined ? updates.draftCtaLink : current.draftCtaLink,
        hasChanges: true,
      };
      return jsonResponse(200, { success: true, data: serverState.slots[slotIndex] });
    }
    return jsonResponse(404, { success: false, error: 'Campo não encontrado.' });
  }

  if (subPath === 'site-content/save-drafts' && event.httpMethod === 'POST') {
    return jsonResponse(200, {
      success: true,
      message: 'Rascunhos guardados com sucesso.',
      data: serverState,
    });
  }

  if (subPath === 'site-content/publish' && event.httpMethod === 'POST') {
    let count = 0;
    serverState.slots = serverState.slots.map((s) => {
      if (s.hasChanges) {
        count++;
        return {
          ...s,
          imageUrl: s.draftImageUrl !== undefined ? s.draftImageUrl : s.imageUrl,
          altText: s.draftAltText !== undefined ? s.draftAltText : s.altText,
          aspectRatio: s.draftAspectRatio !== undefined ? s.draftAspectRatio : s.aspectRatio,
          fit: s.draftFit !== undefined ? s.draftFit : s.fit,
          position: s.draftPosition !== undefined ? s.draftPosition : s.position,
          title: s.draftTitle !== undefined ? s.draftTitle : s.title,
          subtitle: s.draftSubtitle !== undefined ? s.draftSubtitle : s.subtitle,
          text: s.draftText !== undefined ? s.draftText : s.text,
          ctaText: s.draftCtaText !== undefined ? s.draftCtaText : s.ctaText,
          ctaLink: s.draftCtaLink !== undefined ? s.draftCtaLink : s.ctaLink,
          hasChanges: false,
          draftImageUrl: undefined,
          draftAltText: undefined,
          draftAspectRatio: undefined,
          draftFit: undefined,
          draftPosition: undefined,
          draftTitle: undefined,
          draftSubtitle: undefined,
          draftText: undefined,
          draftCtaText: undefined,
          draftCtaLink: undefined,
        };
      }
      return s;
    });

    serverState.lastPublished = new Date().toISOString();
    return jsonResponse(200, {
      success: true,
      message: `${count} alterações publicadas com sucesso!`,
      data: serverState,
    });
  }

  if (subPath === 'site-content/revert' && event.httpMethod === 'POST') {
    serverState.slots = serverState.slots.map((s) => ({
      ...s,
      hasChanges: false,
      draftImageUrl: undefined,
      draftAltText: undefined,
      draftAspectRatio: undefined,
      draftFit: undefined,
      draftPosition: undefined,
    }));
    return jsonResponse(200, {
      success: true,
      message: 'Rascunhos revertidos com sucesso.',
      data: serverState,
    });
  }

  if (subPath === 'site-content/custom-section') {
    if (event.httpMethod === 'POST') {
      const newSec = {
        id: `sec-${Date.now()}`,
        page: body.page || 'home',
        sectionName: body.sectionName || 'Nova Secção',
        title: body.title || '',
        text: body.text || '',
        images: body.images || [],
        buttonText: body.buttonText || '',
        buttonLink: body.buttonLink || '',
        order: body.order || serverState.customSections.length + 1,
        status: body.status || 'publicado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serverState.customSections.push(newSec);
      return jsonResponse(201, { success: true, data: newSec });
    }
  }

  if (subPath.startsWith('site-content/custom-section/') && event.httpMethod === 'DELETE') {
    const id = subPath.split('/')[2];
    serverState.customSections = serverState.customSections.filter((s) => s.id !== id);
    return jsonResponse(200, { success: true });
  }

  if (subPath === 'site-content/media-library') {
    if (event.httpMethod === 'POST') {
      const newItem = {
        id: `lib-${Date.now()}`,
        name: body.name || 'Nova Imagem',
        url: body.url,
        category: body.category || 'Geral',
        aspectRatio: body.aspectRatio || '16:9',
        size: body.size || 'Otimizado',
        origin: body.origin || 'Painel Administrativo',
        createdAt: new Date().toISOString(),
        usedIn: [],
      };
      serverState.mediaLibrary.unshift(newItem);
      return jsonResponse(201, { success: true, data: newItem });
    }
  }

  if (subPath.startsWith('site-content/media-library/') && event.httpMethod === 'DELETE') {
    const id = subPath.split('/')[2];
    serverState.mediaLibrary = serverState.mediaLibrary.filter((m) => m.id !== id);
    return jsonResponse(200, { success: true });
  }

  // Fallback for general routes
  return jsonResponse(200, { success: true, message: 'OralPro Serverless API ready.' });
};
