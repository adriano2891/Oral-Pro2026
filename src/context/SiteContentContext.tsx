import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SiteContentSlot, CustomSection, MediaLibraryItem, AuditLogEntry } from '../types';
import {
  INITIAL_SLOTS,
  INITIAL_CUSTOM_SECTIONS,
  INITIAL_MEDIA_LIBRARY,
  INITIAL_AUDIT_LOGS,
  INITIAL_LAST_PUBLISHED,
} from '../data/initialSiteContent';
import { getIdbCMSData, saveIdbCMSData } from '../utils/idbStorage';

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

function parseStoredCMSState(parsed: any) {
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
  return null;
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
        const validated = parseStoredCMSState(parsed);
        if (validated) return validated;
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

async function persistState(data: {
  slots: SiteContentSlot[];
  customSections: CustomSection[];
  mediaLibrary: MediaLibraryItem[];
  auditLogs: AuditLogEntry[];
  lastPublished: string;
}) {
  // 1. Always save full state into IndexedDB (virtually unlimited quota, handles HD images easily)
  await saveIdbCMSData(data);

  // 2. Try saving to localStorage as backup (strip large data URLs if quota exceeded)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      try {
        // If quota exceeded, create lightweight version for localStorage
        const lightweight = {
          ...data,
          slots: data.slots.map((s) => ({
            ...s,
            // If dataUrl is too large for localStorage, omit it from localStorage backup since it lives in IndexedDB
            imageUrl: s.imageUrl?.startsWith('data:') && s.imageUrl.length > 50000 ? '' : s.imageUrl,
            draftImageUrl: s.draftImageUrl?.startsWith('data:') && s.draftImageUrl.length > 50000 ? '' : s.draftImageUrl,
          })),
        };
        localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(lightweight));
      } catch (e2) {
        console.warn('LocalStorage quota notice - full image data safely retained in IndexedDB.', e2);
      }
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

  // Real-time mutable reference to prevent stale closure overwrites
  const stateRef = useRef({
    slots: initialData.slots,
    customSections: initialData.customSections,
    mediaLibrary: initialData.mediaLibrary,
    auditLogs: initialData.auditLogs,
    lastPublished: initialData.lastPublished,
  });

  // Sync state to memory, React state, and persistent storage
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

      // Update stateRef immediately so subsequent calls in the same event loop read current values
      stateRef.current = {
        slots: newSlots,
        customSections: newCustomSections,
        mediaLibrary: updatedLibrary,
        auditLogs: newAuditLogs,
        lastPublished: newLastPublished,
      };

      setSlots(newSlots);
      setCustomSections(newCustomSections);
      setMediaLibrary(updatedLibrary);
      setAuditLogs(newAuditLogs);
      setLastPublished(newLastPublished);
      setHasUnpublished(unpublished);

      persistState({
        slots: newSlots,
        customSections: newCustomSections,
        mediaLibrary: updatedLibrary,
        auditLogs: newAuditLogs,
        lastPublished: newLastPublished,
      });
    },
    []
  );

  // Initialize from IndexedDB on mount if available (captures heavy uploads)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const idbData = await getIdbCMSData();
        if (idbData && isMounted) {
          const validated = parseStoredCMSState(idbData);
          if (validated) {
            syncState(
              validated.slots,
              validated.customSections,
              validated.mediaLibrary,
              validated.auditLogs,
              validated.lastPublished
            );
          }
        }
      } catch (e) {
        console.warn('Notice reading IndexedDB CMS:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [syncState]);

  const refreshContent = useCallback(async () => {
    try {
      // 1. Try server API endpoint first (works on dev and backend-enabled hosts)
      const res = await fetch('/api/site-content');
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && data.success && data.data && Array.isArray(data.data.slots)) {
            // Merge intelligently: preserve user's local slot adjustments (e.g. aspect ratio, custom photos, fit)
            const currentSlotsMap = new Map(stateRef.current.slots.map((s) => [s.key, s]));
            const mergedSlots: SiteContentSlot[] = data.data.slots.map((serverSlot: SiteContentSlot) => {
              const localSlot = currentSlotsMap.get(serverSlot.key);
              if (!localSlot) return serverSlot;
              return {
                ...serverSlot,
                aspectRatio: localSlot.aspectRatio || serverSlot.aspectRatio,
                draftAspectRatio: localSlot.draftAspectRatio,
                fit: localSlot.fit || serverSlot.fit,
                draftFit: localSlot.draftFit,
                position: localSlot.position || serverSlot.position,
                draftPosition: localSlot.draftPosition,
                imageUrl: localSlot.imageUrl || serverSlot.imageUrl,
                draftImageUrl: localSlot.draftImageUrl,
                altText: localSlot.altText || serverSlot.altText,
                draftAltText: localSlot.draftAltText,
                hasChanges: localSlot.hasChanges || false,
              };
            });

            // Also include any slots present locally that weren't in server response
            const serverSlotKeys = new Set(data.data.slots.map((s: SiteContentSlot) => s.key));
            INITIAL_SLOTS.forEach((s) => {
              if (!serverSlotKeys.has(s.key)) {
                const localSlot = currentSlotsMap.get(s.key) || s;
                mergedSlots.push(localSlot);
              }
            });

            syncState(
              mergedSlots,
              data.data.customSections || stateRef.current.customSections,
              data.data.mediaLibrary || stateRef.current.mediaLibrary,
              data.data.auditLogs || stateRef.current.auditLogs,
              data.data.lastPublished || stateRef.current.lastPublished
            );
            return;
          }
        }
      }

      // 2. Fallback check for static distribution
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
  }, [syncState]);

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
        imageUrl: slot.draftImageUrl !== undefined && slot.draftImageUrl !== '' ? slot.draftImageUrl : (slot.imageUrl || fallbackUrl),
        altText: slot.draftAltText !== undefined ? slot.draftAltText : (slot.altText || fallbackAlt),
        aspectRatio: slot.draftAspectRatio || slot.aspectRatio || '16:9',
        fit: slot.draftFit || slot.fit || 'cover',
        position: slot.draftPosition || slot.position || 'center',
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
    const currentSlots = stateRef.current.slots;
    const updatedSlots = currentSlots.map((slot) => {
      if (slot.key !== key) return slot;

      // Immediately fix and update both published and draft aspect ratio when changed
      const newAspect = updates.aspectRatio !== undefined 
        ? updates.aspectRatio 
        : updates.draftAspectRatio !== undefined 
          ? updates.draftAspectRatio 
          : slot.aspectRatio;

      const newDraftAspect = updates.draftAspectRatio !== undefined 
        ? updates.draftAspectRatio 
        : updates.aspectRatio !== undefined 
          ? updates.aspectRatio 
          : slot.draftAspectRatio;

      const newFit = updates.fit !== undefined 
        ? updates.fit 
        : updates.draftFit !== undefined 
          ? updates.draftFit 
          : slot.fit;

      const newDraftFit = updates.draftFit !== undefined 
        ? updates.draftFit 
        : updates.fit !== undefined 
          ? updates.fit 
          : slot.draftFit;

      const newPosition = updates.position !== undefined 
        ? updates.position 
        : updates.draftPosition !== undefined 
          ? updates.draftPosition 
          : slot.position;

      const newDraftPosition = updates.draftPosition !== undefined 
        ? updates.draftPosition 
        : updates.position !== undefined 
          ? updates.position 
          : slot.draftPosition;

      const newImageUrl = updates.imageUrl !== undefined ? updates.imageUrl : slot.imageUrl;
      const newAltText = updates.altText !== undefined ? updates.altText : slot.altText;

      const newDraftImageUrl = updates.draftImageUrl !== undefined ? updates.draftImageUrl : slot.draftImageUrl;
      const newDraftAltText = updates.draftAltText !== undefined ? updates.draftAltText : slot.draftAltText;
      const newDraftTitle = updates.draftTitle !== undefined ? updates.draftTitle : slot.draftTitle;
      const newDraftSubtitle = updates.draftSubtitle !== undefined ? updates.draftSubtitle : slot.draftSubtitle;
      const newDraftText = updates.draftText !== undefined ? updates.draftText : slot.draftText;
      const newDraftCtaText = updates.draftCtaText !== undefined ? updates.draftCtaText : slot.draftCtaText;
      const newDraftCtaLink = updates.draftCtaLink !== undefined ? updates.draftCtaLink : slot.draftCtaLink;

      const hasChanges =
        (newDraftImageUrl !== undefined && newDraftImageUrl !== newImageUrl) ||
        (newDraftAltText !== undefined && newDraftAltText !== newAltText) ||
        (newDraftAspect !== undefined && newDraftAspect !== newAspect) ||
        (newDraftFit !== undefined && newDraftFit !== newFit) ||
        (newDraftPosition !== undefined && newDraftPosition !== newPosition) ||
        (newDraftTitle !== undefined && newDraftTitle !== (slot.title || '')) ||
        (newDraftSubtitle !== undefined && newDraftSubtitle !== (slot.subtitle || '')) ||
        (newDraftText !== undefined && newDraftText !== (slot.text || '')) ||
        (newDraftCtaText !== undefined && newDraftCtaText !== (slot.ctaText || '')) ||
        (newDraftCtaLink !== undefined && newDraftCtaLink !== (slot.ctaLink || ''));

      return {
        ...slot,
        aspectRatio: newAspect,
        draftAspectRatio: newDraftAspect,
        fit: newFit,
        draftFit: newDraftFit,
        position: newPosition,
        draftPosition: newDraftPosition,
        imageUrl: newImageUrl,
        altText: newAltText,
        draftImageUrl: newDraftImageUrl,
        draftAltText: newDraftAltText,
        draftTitle: newDraftTitle,
        draftSubtitle: newDraftSubtitle,
        draftText: newDraftText,
        draftCtaText: newDraftCtaText,
        draftCtaLink: newDraftCtaLink,
        hasChanges,
      };
    });

    syncState(
      updatedSlots,
      stateRef.current.customSections,
      stateRef.current.mediaLibrary,
      stateRef.current.auditLogs,
      stateRef.current.lastPublished
    );

    // Optional server sync (does not throw on Netlify static hosting)
    try {
      await fetch('/api/site-content/slot', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ key, updates }),
      });
    } catch {
      // Local sync is authoritative
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

    const newLogs = [newLog, ...stateRef.current.auditLogs].slice(0, 50);
    syncState(
      stateRef.current.slots,
      stateRef.current.customSections,
      stateRef.current.mediaLibrary,
      newLogs,
      stateRef.current.lastPublished
    );

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
    const currentSlots = stateRef.current.slots;
    const publishedSlots = currentSlots.map((slot) => {
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

    const publishedSections = stateRef.current.customSections.map((sec: any) => ({
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

    const newLogs = [newLog, ...stateRef.current.auditLogs].slice(0, 50);
    syncState(publishedSlots, publishedSections, stateRef.current.mediaLibrary, newLogs, now);

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
    const revertedSlots = stateRef.current.slots.map((slot) => ({
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

    const newLogs = [newLog, ...stateRef.current.auditLogs].slice(0, 50);
    syncState(
      revertedSlots,
      stateRef.current.customSections,
      stateRef.current.mediaLibrary,
      newLogs,
      stateRef.current.lastPublished
    );

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
    const currentSections = stateRef.current.customSections;

    if (data.id) {
      updatedSections = currentSections.map((s) =>
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
        order: data.order ?? currentSections.length + 1,
        status: data.status || 'publicado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedSections = [...currentSections, newSec];
    }

    syncState(
      stateRef.current.slots,
      updatedSections,
      stateRef.current.mediaLibrary,
      stateRef.current.auditLogs,
      stateRef.current.lastPublished
    );

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
    const updatedSections = stateRef.current.customSections.filter((s) => s.id !== id);
    syncState(
      stateRef.current.slots,
      updatedSections,
      stateRef.current.mediaLibrary,
      stateRef.current.auditLogs,
      stateRef.current.lastPublished
    );

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

    const updatedLibrary = [newItem, ...stateRef.current.mediaLibrary];
    syncState(
      stateRef.current.slots,
      stateRef.current.customSections,
      updatedLibrary,
      stateRef.current.auditLogs,
      stateRef.current.lastPublished
    );

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
    const updatedLibrary = stateRef.current.mediaLibrary.filter((m) => m.id !== id);
    syncState(
      stateRef.current.slots,
      stateRef.current.customSections,
      updatedLibrary,
      stateRef.current.auditLogs,
      stateRef.current.lastPublished
    );

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
