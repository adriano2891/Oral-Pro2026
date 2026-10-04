import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteContentSlot, CustomSection, MediaLibraryItem, AuditLogEntry } from '../types';
import {
  INITIAL_SLOTS,
  INITIAL_CUSTOM_SECTIONS,
  INITIAL_MEDIA_LIBRARY,
  INITIAL_AUDIT_LOGS,
  INITIAL_LAST_PUBLISHED,
} from '../data/initialSiteContent';

const CMS_STORAGE_KEY = 'oralpro_cms_state_v1';

interface SiteContentContextType {
  slots: SiteContentSlot[];
  customSections: CustomSection[];
  mediaLibrary: MediaLibraryItem[];
  auditLogs: AuditLogEntry[];
  lastPublished: string;
  hasUnpublished: boolean;
  isLoading: boolean;
  getSlot: (
    key: string,
    fallbackUrl?: string,
    fallbackAlt?: string
  ) => {
    imageUrl: string;
    altText: string;
    aspectRatio: string;
    fit: 'cover' | 'contain';
    position: 'center' | 'top' | 'bottom';
  };
  getCustomSectionsForPage: (page: string) => CustomSection[];
  updateSlot: (key: string, updates: Partial<SiteContentSlot>) => Promise<boolean>;
  saveDrafts: () => Promise<boolean>;
  publishChanges: () => Promise<boolean>;
  revertDrafts: () => Promise<boolean>;
  saveCustomSection: (data: Partial<CustomSection> & { id?: string }) => Promise<boolean>;
  deleteCustomSection: (id: string) => Promise<boolean>;
  uploadMedia: (data: {
    name: string;
    url: string;
    category?: string;
    aspectRatio?: string;
    size?: string;
    origin?: string;
  }) => Promise<boolean>;
  deleteMedia: (id: string) => Promise<boolean>;
  refreshContent: () => Promise<void>;
}

const SiteContentContext = createContext<SiteContentContextType | undefined>(undefined);

function getAuthHeaders(): HeadersInit {
  const token =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('oralpro_admin_token') || sessionStorage.getItem('oralpro_admin_token'))) ||
    '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function recalculateLibraryUsages(
  slotsList: SiteContentSlot[],
  sectionsList: CustomSection[],
  libraryList: MediaLibraryItem[]
): MediaLibraryItem[] {
  const urlToUsed: Record<string, string[]> = {};

  slotsList.forEach((s) => {
    const url = s.draftImageUrl || s.imageUrl;
    if (url) {
      if (!urlToUsed[url]) urlToUsed[url] = [];
      const label = `${s.pageLabel} > ${s.sectionLabel}`;
      if (!urlToUsed[url].includes(label)) urlToUsed[url].push(label);
    }
  });

  sectionsList.forEach((sec) => {
    sec.images?.forEach((img) => {
      if (img.url) {
        if (!urlToUsed[img.url]) urlToUsed[img.url] = [];
        const label = `${sec.page} > ${sec.sectionName}`;
        if (!urlToUsed[img.url].includes(label)) urlToUsed[img.url].push(label);
      }
    });
  });

  return libraryList.map((item) => ({
    ...item,
    usedIn: urlToUsed[item.url] || [],
  }));
}

function loadInitialCMSState(): {
  slots: SiteContentSlot[];
  customSections: CustomSection[];
  mediaLibrary: MediaLibraryItem[];
  auditLogs: AuditLogEntry[];
  lastPublished: string;
  hasUnpublished: boolean;
} {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
          const loadedKeys = new Set(parsed.slots.map((s: SiteContentSlot) => s.key));
          const mergedSlots: SiteContentSlot[] = [
            ...parsed.slots,
            ...INITIAL_SLOTS.filter((s) => !loadedKeys.has(s.key)),
          ];
          const hasUnpublished =
            mergedSlots.some((s) => s.hasChanges) ||
            (parsed.customSections || []).some((c: any) => c.hasChanges);

          const library = recalculateLibraryUsages(
            mergedSlots,
            parsed.customSections || INITIAL_CUSTOM_SECTIONS,
            parsed.mediaLibrary || INITIAL_MEDIA_LIBRARY
          );

          return {
            slots: mergedSlots,
            customSections: parsed.customSections || INITIAL_CUSTOM_SECTIONS,
            mediaLibrary: library,
            auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
            lastPublished: parsed.lastPublished || INITIAL_LAST_PUBLISHED,
            hasUnpublished,
          };
        }
      }
    } catch (err) {
      console.warn('Error reading stored CMS state from localStorage:', err);
    }
  }

  const initialLibrary = recalculateLibraryUsages(
    INITIAL_SLOTS,
    INITIAL_CUSTOM_SECTIONS,
    INITIAL_MEDIA_LIBRARY
  );

  return {
    slots: INITIAL_SLOTS,
    customSections: INITIAL_CUSTOM_SECTIONS,
    mediaLibrary: initialLibrary,
    auditLogs: INITIAL_AUDIT_LOGS,
    lastPublished: INITIAL_LAST_PUBLISHED,
    hasUnpublished: false,
  };
}

function persistStateToStorage(data: {
  slots: SiteContentSlot[];
  customSections: CustomSection[];
  mediaLibrary: MediaLibraryItem[];
  auditLogs: AuditLogEntry[];
  lastPublished: string;
}) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Unable to persist CMS state to localStorage:', err);
    }
  }
}

export const SiteContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialData] = useState(loadInitialCMSState);
  const [slots, setSlots] = useState<SiteContentSlot[]>(initialData.slots);
  const [customSections, setCustomSections] = useState<CustomSection[]>(initialData.customSections);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>(initialData.mediaLibrary);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialData.auditLogs);
  const [lastPublished, setLastPublished] = useState<string>(initialData.lastPublished);
  const [hasUnpublished, setHasUnpublished] = useState<boolean>(initialData.hasUnpublished);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync to localStorage whenever published state or drafts change
  const syncState = useCallback(
    (
      newSlots: SiteContentSlot[],
      newCustomSections: CustomSection[],
      newMediaLibrary: MediaLibraryItem[],
      newAuditLogs: AuditLogEntry[],
      newLastPublished: string
    ) => {
      const updatedLibrary = recalculateLibraryUsages(newSlots, newCustomSections, newMediaLibrary);
      const unpublished =
        newSlots.some((s) => s.hasChanges) || newCustomSections.some((c: any) => c.hasChanges);

      setSlots(newSlots);
      setCustomSections(newCustomSections);
      setMediaLibrary(updatedLibrary);
      setAuditLogs(newAuditLogs);
      setLastPublished(newLastPublished);
      setHasUnpublished(unpublished);

      persistStateToStorage({
        slots: newSlots,
        customSections: newCustomSections,
        mediaLibrary: updatedLibrary,
        auditLogs: newAuditLogs,
        lastPublished: newLastPublished,
      });
    },
    []
  );

  const refreshContent = useCallback(async () => {
    try {
      // 1. Try server API endpoint first
      const res = await fetch('/api/site-content');
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && data.success && data.data && Array.isArray(data.data.slots)) {
            const loadedKeys = new Set(data.data.slots.map((s: SiteContentSlot) => s.key));
            const mergedSlots: SiteContentSlot[] = [
              ...data.data.slots,
              ...INITIAL_SLOTS.filter((s) => !loadedKeys.has(s.key)),
            ];

            syncState(
              mergedSlots,
              data.data.customSections || customSections,
              data.data.mediaLibrary || mediaLibrary,
              data.data.auditLogs || auditLogs,
              data.data.lastPublished || lastPublished
            );
            return;
          }
        }
      }

      // 2. If API is not available (e.g. Netlify static SPA without functions),
      // try static fallback file if localStorage has no previous edits
      if (typeof window !== 'undefined' && !localStorage.getItem(CMS_STORAGE_KEY)) {
        try {
          const staticRes = await fetch('/data/site_content.json');
          const staticType = staticRes.headers.get('content-type') || '';
          if (staticRes.ok && staticType.includes('application/json')) {
            const staticData = await staticRes.json();
            if (staticData && Array.isArray(staticData.slots)) {
              syncState(
                staticData.slots,
                staticData.customSections || [],
                staticData.mediaLibrary || INITIAL_MEDIA_LIBRARY,
                staticData.auditLogs || INITIAL_AUDIT_LOGS,
                staticData.lastPublished || INITIAL_LAST_PUBLISHED
              );
            }
          }
        } catch {
          // Keep current state
        }
      }
    } catch (err) {
      console.warn('Site content refresh notice (operating in local-first sync mode):', err);
    } finally {
      setIsLoading(false);
    }
  }, [syncState, customSections, mediaLibrary, auditLogs, lastPublished]);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  const getSlot = useCallback(
    (key: string, fallbackUrl = '', fallbackAlt = '') => {
      const slot = slots.find((s) => s.key === key);
      if (!slot) {
        return {
          imageUrl: fallbackUrl,
          altText: fallbackAlt,
          aspectRatio: '16:9',
          fit: 'cover' as const,
          position: 'center' as const,
        };
      }
      return {
        imageUrl: slot.imageUrl || fallbackUrl,
        altText: slot.altText || fallbackAlt,
        aspectRatio: slot.aspectRatio || '16:9',
        fit: slot.fit || 'cover',
        position: slot.position || 'center',
      };
    },
    [slots]
  );

  const getCustomSectionsForPage = useCallback(
    (page: string) => {
      return customSections
        .filter((sec) => sec.page === page && sec.status === 'publicado')
        .sort((a, b) => a.order - b.order);
    },
    [customSections]
  );

  const updateSlot = async (key: string, updates: Partial<SiteContentSlot>): Promise<boolean> => {
    const updatedSlots = slots.map((slot) => {
      if (slot.key !== key) return slot;

      const newDraftImageUrl = updates.draftImageUrl !== undefined ? updates.draftImageUrl : slot.draftImageUrl;
      const newDraftAltText = updates.draftAltText !== undefined ? updates.draftAltText : slot.draftAltText;
      const newDraftAspect = updates.draftAspectRatio !== undefined ? updates.draftAspectRatio : slot.draftAspectRatio;
      const newDraftFit = updates.draftFit !== undefined ? updates.draftFit : slot.draftFit;
      const newDraftPosition = updates.draftPosition !== undefined ? updates.draftPosition : slot.draftPosition;
      const newDraftTitle = updates.draftTitle !== undefined ? updates.draftTitle : slot.draftTitle;
      const newDraftSubtitle = updates.draftSubtitle !== undefined ? updates.draftSubtitle : slot.draftSubtitle;
      const newDraftText = updates.draftText !== undefined ? updates.draftText : slot.draftText;
      const newDraftCtaText = updates.draftCtaText !== undefined ? updates.draftCtaText : slot.draftCtaText;
      const newDraftCtaLink = updates.draftCtaLink !== undefined ? updates.draftCtaLink : slot.draftCtaLink;

      const hasChanges =
        (newDraftImageUrl !== undefined && newDraftImageUrl !== slot.imageUrl) ||
        (newDraftAltText !== undefined && newDraftAltText !== slot.altText) ||
        (newDraftAspect !== undefined && newDraftAspect !== slot.aspectRatio) ||
        (newDraftFit !== undefined && newDraftFit !== slot.fit) ||
        (newDraftPosition !== undefined && newDraftPosition !== slot.position) ||
        (newDraftTitle !== undefined && newDraftTitle !== (slot.title || '')) ||
        (newDraftSubtitle !== undefined && newDraftSubtitle !== (slot.subtitle || '')) ||
        (newDraftText !== undefined && newDraftText !== (slot.text || '')) ||
        (newDraftCtaText !== undefined && newDraftCtaText !== (slot.ctaText || '')) ||
        (newDraftCtaLink !== undefined && newDraftCtaLink !== (slot.ctaLink || ''));

      return {
        ...slot,
        draftImageUrl: newDraftImageUrl,
        draftAltText: newDraftAltText,
        draftAspectRatio: newDraftAspect,
        draftFit: newDraftFit,
        draftPosition: newDraftPosition,
        draftTitle: newDraftTitle,
        draftSubtitle: newDraftSubtitle,
        draftText: newDraftText,
        draftCtaText: newDraftCtaText,
        draftCtaLink: newDraftCtaLink,
        hasChanges,
      };
    });

    syncState(updatedSlots, customSections, mediaLibrary, auditLogs, lastPublished);

    // Also attempt server sync if backend is active
    try {
      await fetch('/api/site-content/slot', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ key, updates }),
      });
    } catch {
      // Local sync succeeded, safe to proceed
    }

    return true;
  };

  const saveDrafts = async (): Promise<boolean> => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      action: 'Rascunhos guardados',
      user: 'Administrador OralPro',
      details: 'Alterações guardadas no banco de rascunhos para posterior publicação.',
      timestamp: new Date().toISOString(),
    };

    const newLogs = [newLog, ...auditLogs].slice(0, 50);
    syncState(slots, customSections, mediaLibrary, newLogs, lastPublished);

    try {
      await fetch('/api/site-content/save-drafts', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Local storage handled persistence
    }

    return true;
  };

  const publishChanges = async (): Promise<boolean> => {
    let changedCount = 0;
    const publishedSlots = slots.map((slot) => {
      if (!slot.hasChanges) return slot;
      changedCount++;

      return {
        ...slot,
        imageUrl: slot.draftImageUrl !== undefined ? slot.draftImageUrl : slot.imageUrl,
        altText: slot.draftAltText !== undefined ? slot.draftAltText : slot.altText,
        aspectRatio: slot.draftAspectRatio !== undefined ? slot.draftAspectRatio : slot.aspectRatio,
        fit: slot.draftFit !== undefined ? slot.draftFit : slot.fit,
        position: slot.draftPosition !== undefined ? slot.draftPosition : slot.position,
        title: slot.draftTitle !== undefined ? slot.draftTitle : slot.title,
        subtitle: slot.draftSubtitle !== undefined ? slot.draftSubtitle : slot.subtitle,
        text: slot.draftText !== undefined ? slot.draftText : slot.text,
        ctaText: slot.draftCtaText !== undefined ? slot.draftCtaText : slot.ctaText,
        ctaLink: slot.draftCtaLink !== undefined ? slot.draftCtaLink : slot.ctaLink,
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
    });

    const publishedSections = customSections.map((sec: any) => ({
      ...sec,
      hasChanges: false,
    }));

    const now = new Date().toISOString();
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      action: 'Publicação oficial de alterações',
      user: 'Administrador OralPro',
      details: `${changedCount} campos/secções promovidos a versão de produção.`,
      timestamp: now,
    };

    const newLogs = [newLog, ...auditLogs].slice(0, 50);
    syncState(publishedSlots, publishedSections, mediaLibrary, newLogs, now);

    try {
      await fetch('/api/site-content/publish', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Local storage handled persistence
    }

    return true;
  };

  const revertDrafts = async (): Promise<boolean> => {
    const revertedSlots = slots.map((slot) => ({
      ...slot,
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
    }));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      action: 'Rascunhos revertidos',
      user: 'Administrador OralPro',
      details: 'Todas as modificações não publicadas foram descartadas.',
      timestamp: new Date().toISOString(),
    };

    const newLogs = [newLog, ...auditLogs].slice(0, 50);
    syncState(revertedSlots, customSections, mediaLibrary, newLogs, lastPublished);

    try {
      await fetch('/api/site-content/revert', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Local storage handled persistence
    }

    return true;
  };

  const saveCustomSection = async (
    data: Partial<CustomSection> & { id?: string }
  ): Promise<boolean> => {
    let updatedSections: CustomSection[];

    if (data.id) {
      updatedSections = customSections.map((s) =>
        s.id === data.id
          ? {
              ...s,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : s
      );
    } else {
      const newSec: CustomSection = {
        id: `sec-${Date.now()}`,
        page: (data.page as any) || 'home',
        sectionName: data.sectionName || 'Nova Secção',
        title: data.title || '',
        text: data.text || '',
        images: data.images || [],
        buttonText: data.buttonText || '',
        buttonLink: data.buttonLink || '',
        order: data.order ?? customSections.length + 1,
        status: data.status || 'publicado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedSections = [...customSections, newSec];
    }

    syncState(slots, updatedSections, mediaLibrary, auditLogs, lastPublished);

    try {
      await fetch('/api/site-content/custom-section', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
    } catch {
      // Local storage handled persistence
    }

    return true;
  };

  const deleteCustomSection = async (id: string): Promise<boolean> => {
    const updatedSections = customSections.filter((s) => s.id !== id);
    syncState(slots, updatedSections, mediaLibrary, auditLogs, lastPublished);

    try {
      await fetch(`/api/site-content/custom-section/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {
      // Local storage handled persistence
    }

    return true;
  };

  const uploadMedia = async (data: {
    name: string;
    url: string;
    category?: string;
    aspectRatio?: string;
    size?: string;
    origin?: string;
  }): Promise<boolean> => {
    const newItem: MediaLibraryItem = {
      id: `lib-${Date.now()}`,
      name: data.name || 'Nova Imagem',
      url: data.url,
      category: data.category || 'Geral',
      aspectRatio: data.aspectRatio || '16:9',
      size: data.size || 'Otimizado',
      origin: data.origin || 'Painel Administrativo',
      createdAt: new Date().toISOString(),
      usedIn: [],
    };

    const updatedLibrary = [newItem, ...mediaLibrary];
    syncState(slots, customSections, updatedLibrary, auditLogs, lastPublished);

    try {
      await fetch('/api/site-content/media-library', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
    } catch {
      // Local storage handled persistence
    }

    return true;
  };

  const deleteMedia = async (id: string): Promise<boolean> => {
    const updatedLibrary = mediaLibrary.filter((m) => m.id !== id);
    syncState(slots, customSections, updatedLibrary, auditLogs, lastPublished);

    try {
      await fetch(`/api/site-content/media-library/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {
      // Local storage handled persistence
    }

    return true;
  };

  return (
    <SiteContentContext.Provider
      value={{
        slots,
        customSections,
        mediaLibrary,
        auditLogs,
        lastPublished,
        hasUnpublished,
        isLoading,
        getSlot,
        getCustomSectionsForPage,
        updateSlot,
        saveDrafts,
        publishChanges,
        revertDrafts,
        saveCustomSection,
        deleteCustomSection,
        uploadMedia,
        deleteMedia,
        refreshContent,
      }}
    >
      {children}
    </SiteContentContext.Provider>
  );
};

export const useSiteContent = () => {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error('useSiteContent must be used within a SiteContentProvider');
  }
  return context;
};
