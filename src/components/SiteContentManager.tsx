import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Smartphone,
  Save,
  Send,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Layers,
  FolderOpen,
  X,
  ExternalLink,
  Check,
  Filter,
  FileImage,
  Info,
} from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import { SiteContentSlot, CustomSection, CustomSectionImage, MediaLibraryItem } from '../types';

// Client-side image compression utility
async function compressImageFile(file: File): Promise<{ dataUrl: string; sizeKb: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, sizeKb: Math.round(file.size / 1024), width: img.width, height: img.height });
          return;
        }

        // Draw image naturally without any filters or distortions to respect clinical treatment reality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP if supported, fallback to JPEG
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/webp', 0.88);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        }

        const approxSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, sizeKb: approxSizeKb, width, height });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface SiteContentManagerProps {
  initialSubTab?: 'campos' | 'seccoes' | 'biblioteca';
  initialPageFilter?: string;
  onNavigateToPreview?: () => void;
}

export const SiteContentManager: React.FC<SiteContentManagerProps> = ({
  initialSubTab = 'campos',
  initialPageFilter = 'todos',
  onNavigateToPreview,
}) => {
  const {
    slots,
    customSections,
    mediaLibrary,
    lastPublished,
    hasUnpublished,
    updateSlot,
    saveDrafts,
    publishChanges,
    revertDrafts,
    saveCustomSection,
    deleteCustomSection,
    uploadMedia,
    deleteMedia,
    refreshContent,
  } = useSiteContent();

  // Sub-navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'campos' | 'seccoes' | 'biblioteca'>(initialSubTab);

  // Filters
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>(initialPageFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('todos');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('todos');

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (initialPageFilter) setSelectedPageFilter(initialPageFilter);
  }, [initialPageFilter]);

  // Modals
  const [selectedSlotForImage, setSelectedSlotForImage] = useState<SiteContentSlot | null>(null);
  const [previewModalSlot, setPreviewModalSlot] = useState<SiteContentSlot | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showGlobalSitePreview, setShowGlobalSitePreview] = useState<boolean>(false);
  const [globalPreviewPage, setGlobalPreviewPage] = useState<'home' | 'servicos' | 'metodo' | 'areas' | 'sobre'>('home');

  // "Adicionar Nova Imagem" modal matching user's uploaded screenshot
  const [showAddImageModal, setShowAddImageModal] = useState<boolean>(false);
  const [newImageTitle, setNewImageTitle] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newImageSection, setNewImageSection] = useState<string>('Hero');
  const [newImageAspect, setNewImageAspect] = useState<string>('16:9');
  const [newImageOrigin, setNewImageOrigin] = useState<string>('Instagram @oralpro.italia');
  const [targetSlotKeyForNewImage, setTargetSlotKeyForNewImage] = useState<string>('');

  // Library Item Detail & Manual Association Modal
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<MediaLibraryItem | null>(null);
  const [manualSlotAssignTarget, setManualSlotAssignTarget] = useState<string>('');
  const [manualAssignConfirmed, setManualAssignConfirmed] = useState<boolean>(false);

  // Custom Section Modal
  const [showSectionModal, setShowSectionModal] = useState<boolean>(false);
  const [editingSection, setEditingSection] = useState<Partial<CustomSection> | null>(null);
  const [deleteConfirmSection, setDeleteConfirmSection] = useState<CustomSection | null>(null);

  // Broken image states
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Status feedback
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Hidden File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customSectionFileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusNotice({ type, message });
    setTimeout(() => {
      setStatusNotice(null);
    }, 5000);
  };

  // 1. Top action: Save Drafts
  const handleSaveDrafts = async () => {
    setIsSubmitting(true);
    const success = await saveDrafts();
    setIsSubmitting(false);
    if (success) {
      showNotification('success', 'Rascunho guardado com sucesso na base de dados! As alterações ainda não estão visíveis no site público.');
    } else {
      showNotification('error', 'Não foi possível guardar o rascunho. Verifique a ligação de rede.');
    }
  };

  // 2. Top action: Publish Changes
  const handlePublishAll = async () => {
    setIsSubmitting(true);
    const success = await publishChanges();
    setIsSubmitting(false);
    if (success) {
      showNotification('success', 'Todas as alterações foram publicadas com sucesso e já estão ativas no site público!');
    } else {
      showNotification('error', 'Ocorreu um erro ao publicar as alterações. Tente novamente.');
    }
  };

  // 3. Top action: Revert Drafts
  const handleRevertAll = async () => {
    if (confirm('Pretende descartar todos os rascunhos não publicados e restaurar as versões originais do site público?')) {
      setIsSubmitting(true);
      const success = await revertDrafts();
      setIsSubmitting(false);
      if (success) {
        showNotification('info', 'Rascunhos descartados. O conteúdo publicado original foi restaurado.');
      }
    }
  };

  // 4. Slots Field Change
  const handleSlotFieldChange = async (
    key: string,
    field: 'draftAspectRatio' | 'draftFit' | 'draftPosition' | 'draftAltText' | 'draftImageUrl',
    value: any
  ) => {
    const success = await updateSlot(key, { [field]: value });
    if (success) {
      // Clear broken state if new image url was provided
      if (field === 'draftImageUrl') {
        setBrokenImages((prev) => ({ ...prev, [key]: false }));
      }
      showNotification('info', 'Rascunho atualizado. Clique em "Publicar alterações" para aplicar ao site público.');
    } else {
      showNotification('error', 'Erro ao atualizar campo.');
    }
  };

  // 5. Remove Image from Slot
  const handleRemoveImageFromSlot = async (slot: SiteContentSlot) => {
    if (confirm(`Pretende remover a fotografia do campo "${slot.pageLabel} > ${slot.sectionLabel}"?`)) {
      await updateSlot(slot.key, { draftImageUrl: '' });
      showNotification('info', `Fotografia removida em rascunho do campo "${slot.sectionLabel}".`);
    }
  };

  // 6. Handle local file upload with compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetSlot?: SiteContentSlot) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Formato inválido. Por favor envie um ficheiro JPG, PNG, WebP ou GIF.');
      return;
    }

    try {
      showNotification('info', 'A otimizar e comprimir fotografia com fidelidade clínica...');
      const { dataUrl, sizeKb } = await compressImageFile(file);

      // Add to media library
      const uploadedItem = await uploadMedia({
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: dataUrl,
        category: targetSlot ? targetSlot.pageLabel : 'Geral',
        size: `${sizeKb} KB (Otimizado HD)`,
        aspectRatio: '16:9',
        origin: 'Carregamento do Computador',
      });

      if (targetSlot) {
        await updateSlot(targetSlot.key, { draftImageUrl: dataUrl });
        showNotification('success', `Fotografia associada a "${targetSlot.pageLabel} > ${targetSlot.sectionLabel}" com sucesso!`);
        setSelectedSlotForImage(null);
      } else {
        showNotification('success', `Fotografia "${file.name}" comprimida e adicionada à Biblioteca!`);
      }
    } catch (err: any) {
      showNotification('error', `Falha ao processar ficheiro: ${err.message || 'Erro desconhecido'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 7. Confirm modal "Adicionar Nova Imagem" matching user screenshot
  const handleConfirmAddImageModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) {
      showNotification('error', 'Por favor indique um URL válido ou carregue uma imagem.');
      return;
    }

    const title = newImageTitle.trim() || 'Nova Imagem OralPro';
    setIsSubmitting(true);

    // Add to media library
    await uploadMedia({
      name: title,
      url: newImageUrl.trim(),
      category: newImageSection,
      aspectRatio: newImageAspect,
      origin: newImageOrigin.trim() || 'Instagram @oralpro.italia',
      size: 'Otimizado HD',
    });

    // If a specific slot was targeted or matches section
    if (targetSlotKeyForNewImage) {
      await updateSlot(targetSlotKeyForNewImage, {
        draftImageUrl: newImageUrl.trim(),
        draftAspectRatio: newImageAspect as any,
      });
      showNotification('success', `Imagem "${title}" guardada na biblioteca e associada ao campo selecionado!`);
    } else {
      showNotification('success', `Imagem "${title}" adicionada com sucesso à Biblioteca!`);
    }

    setIsSubmitting(false);
    setShowAddImageModal(false);
    setNewImageTitle('');
    setNewImageUrl('');
    setTargetSlotKeyForNewImage('');
  };

  // 8. Manual Association of a Library Item to a specific slot with confirmation
  const handleConfirmManualAssociation = async () => {
    if (!selectedLibraryItem || !manualSlotAssignTarget) return;

    if (!manualAssignConfirmed) {
      showNotification('error', 'Por favor confirme a caixa de verificação para associar manualmente a imagem ao campo.');
      return;
    }

    const targetSlot = slots.find((s) => s.key === manualSlotAssignTarget);
    if (!targetSlot) return;

    setIsSubmitting(true);
    await updateSlot(targetSlot.key, {
      draftImageUrl: selectedLibraryItem.url,
      draftAspectRatio: (selectedLibraryItem.aspectRatio as any) || targetSlot.aspectRatio,
    });
    setIsSubmitting(false);

    showNotification('success', `Imagem "${selectedLibraryItem.name}" associada com sucesso ao campo "${targetSlot.pageLabel} > ${targetSlot.sectionLabel}"!`);
    setSelectedLibraryItem(null);
    setManualSlotAssignTarget('');
    setManualAssignConfirmed(false);
  };

  // 9. Custom Section Handlers
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editingSection.title) return;

    setIsSubmitting(true);
    const success = await saveCustomSection(editingSection);
    setIsSubmitting(false);
    if (success) {
      showNotification('success', 'Secção personalizada guardada com sucesso!');
      setShowSectionModal(false);
      setEditingSection(null);
    } else {
      showNotification('error', 'Erro ao guardar secção.');
    }
  };

  const handleDuplicateSection = async (sec: CustomSection) => {
    const duplicate: Partial<CustomSection> = {
      page: sec.page,
      sectionName: `${sec.sectionName} (Cópia)`,
      title: sec.title,
      text: sec.text,
      images: [...sec.images],
      buttonText: sec.buttonText,
      buttonLink: sec.buttonLink,
      order: sec.order + 1,
      status: 'oculto',
    };
    await saveCustomSection(duplicate);
    showNotification('success', `Secção duplicada como rascunho oculto.`);
  };

  const handleToggleHideSection = async (sec: CustomSection) => {
    const newStatus = sec.status === 'publicado' ? 'oculto' : 'publicado';
    await saveCustomSection({ id: sec.id, status: newStatus });
    showNotification('info', `Secção "${sec.sectionName}" agora está ${newStatus}.`);
  };

  const handleMoveSection = async (sec: CustomSection, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? Math.max(1, sec.order - 1) : sec.order + 1;
    await saveCustomSection({ id: sec.id, order: newOrder });
    showNotification('info', 'Ordem da secção atualizada.');
  };

  const handleConfirmDeleteSection = async () => {
    if (!deleteConfirmSection) return;
    setIsSubmitting(true);
    const success = await deleteCustomSection(deleteConfirmSection.id);
    setIsSubmitting(false);
    if (success) {
      showNotification('success', `Secção "${deleteConfirmSection.sectionName}" eliminada definitivamente.`);
      setDeleteConfirmSection(null);
    } else {
      showNotification('error', 'Erro ao eliminar secção.');
    }
  };

  // Filtered Slots
  const filteredSlots = slots.filter((slot) => {
    const matchesPage = selectedPageFilter === 'todos' || slot.page === selectedPageFilter;
    const matchesSearch =
      !searchQuery ||
      slot.sectionLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.pageLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.altText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (slot.description && slot.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPage && matchesSearch;
  });

  // Filtered Library
  const filteredLibrary = mediaLibrary.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.origin && item.origin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.usedIn.some((u) => u.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === 'todos' ||
      (item.category && item.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));

    const matchesPage =
      selectedPageFilter === 'todos' ||
      item.usedIn.some((u) => u.toLowerCase().includes(selectedPageFilter.toLowerCase()));

    return matchesSearch && matchesCategory && matchesPage;
  });

  return (
    <div className="space-y-8">
      {/* Hidden File Input for Slots / Global Library */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e, selectedSlotForImage || undefined)}
        accept="image/png,image/jpeg,image/webp,image/jpg,image/svg+xml,image/gif"
        className="hidden"
      />

      {/* ============================================================== */}
      {/* 1. HEADER & TOP CONTROLS: "Conteúdos e imagens do site" */}
      {/* ============================================================== */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Gestão Administrativa OralPro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            Conteúdos e imagens do site
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Faça a gestão de todas as fotografias, enquadramentos, proporções e novos blocos das páginas da OralPro sem alterar código.
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasUnpublished ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span>{hasUnpublished ? 'Existem rascunhos por publicar' : 'Site 100% atualizado e sincronizado'}</span>
            </span>
            <span>·</span>
            <span>Última publicação: {lastPublished ? new Date(lastPublished).toLocaleString('pt-PT') : 'N/D'}</span>
          </div>
        </div>

        {/* 3 Main Required Action Buttons: "Guardar rascunho", "Pré-visualizar", "Publicar alterações" */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Button 1: Guardar rascunho */}
          <button
            onClick={handleSaveDrafts}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-slate-700 active:scale-[0.98]"
            title="Guardar as edições como rascunho sem publicar"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
            <span>Guardar rascunho</span>
          </button>

          {/* Button 2: Pré-visualizar */}
          <button
            onClick={() => setShowGlobalSitePreview(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-slate-700 active:scale-[0.98]"
            title="Pré-visualizar como o site ficará no computador e no telemóvel"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pré-visualizar</span>
          </button>

          {/* Button 3: Publicar alterações */}
          <button
            onClick={handlePublishAll}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer active:scale-[0.98] ${
              hasUnpublished
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900'
                : 'bg-blue-600/80 hover:bg-blue-600 text-white shadow-sm'
            }`}
            title="Publicar todas as alterações de fotos e textos no site público"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publicar alterações {hasUnpublished && '(Pendentes)'}</span>
          </button>

          {hasUnpublished && (
            <button
              onClick={handleRevertAll}
              disabled={isSubmitting}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
              title="Descartar rascunhos não publicados"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {statusNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-medium border animate-fadeIn shadow-sm ${
            statusNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusNotice.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusNotice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{statusNotice.message}</span>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SUBTABS NAVIGATION */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSubTab('campos')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'campos'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Imagens em campos já existentes</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
              {slots.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('seccoes')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'seccoes'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Criar novos campos e secções</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {customSections.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('biblioteca')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'biblioteca'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Biblioteca de imagens</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {mediaLibrary.length}
            </span>
          </button>
        </div>

        {/* Global Search and Quick Action */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar imagem ou campo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => {
              setNewImageTitle('');
              setNewImageUrl('');
              setNewImageSection('Hero');
              setNewImageAspect('16:9');
              setNewImageOrigin('Instagram @oralpro.italia');
              setTargetSlotKeyForNewImage('');
              setShowAddImageModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer shrink-0"
            title="Adicionar Nova Imagem"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Imagem</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUBTAB 1: IMAGENS EM CAMPOS JÁ EXISTENTES */}
      {/* ============================================================== */}
      {activeSubTab === 'campos' && (
        <div className="space-y-6">
          {/* Page Filter Pill Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            {[
              { key: 'todos', label: 'Todas as Páginas' },
              { key: 'home', label: 'Página Inicial' },
              { key: 'servicos', label: 'Serviços' },
              { key: 'metodo', label: 'Método OralPro' },
              { key: 'areas', label: 'Áreas Clínicas' },
              { key: 'sobre', label: 'Sobre a OralPro' },
              { key: 'galeria', label: 'Galeria Oficial (@oralpro.italia)' },
            ].map((page) => (
              <button
                key={page.key}
                onClick={() => setSelectedPageFilter(page.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPageFilter === page.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Controlo Manual e Rastreabilidade: </span>
              Cada imagem está identificada pelo nome da página e da secção. O sistema não associa imagens automaticamente sem a sua confirmação expressa. Pode ajustar o enquadramento (cover/contain), posição focal (centro/topo/base) e proporção de cada campo.
            </div>
          </div>

          {/* Slots Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSlots.map((slot) => {
              const currentImg = slot.draftImageUrl !== undefined ? slot.draftImageUrl : slot.imageUrl;
              const currentAspect = slot.draftAspectRatio || slot.aspectRatio;
              const currentFit = slot.draftFit || slot.fit;
              const currentPos = slot.draftPosition || slot.position;
              const currentAlt = slot.draftAltText !== undefined ? slot.draftAltText : slot.altText;
              const hasDraftChange = slot.hasChanges;
              const isBroken = brokenImages[slot.key];

              return (
                <div
                  key={slot.key}
                  className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                    hasDraftChange
                      ? 'border-amber-300 ring-2 ring-amber-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Identification header: Page > Section */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                        <span>{slot.pageLabel}</span>
                        <span>›</span>
                        <span className="text-slate-700">{slot.sectionLabel}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {slot.pageLabel} › {slot.sectionLabel}
                      </h3>
                      {slot.description && (
                        <p className="text-xs text-slate-500">{slot.description}</p>
                      )}
                    </div>

                    {hasDraftChange && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        Rascunho não publicado
                      </span>
                    )}
                  </div>

                  {/* Body: Thumbnail & Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    {/* Thumbnail preview */}
                    <div className="sm:col-span-5 space-y-2">
                      <div
                        className={`relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner ${
                          currentAspect === '1:1'
                            ? 'aspect-square'
                            : currentAspect === '4:3'
                            ? 'aspect-[4/3]'
                            : currentAspect === '16:10'
                            ? 'aspect-[16/10]'
                            : currentAspect === '3:2'
                            ? 'aspect-[3/2]'
                            : currentAspect === 'auto'
                            ? 'min-h-[140px]'
                            : 'aspect-[16/9]'
                        }`}
                      >
                        {currentImg && !isBroken ? (
                          <img
                            src={currentImg}
                            alt={currentAlt || slot.sectionLabel}
                            onError={() => {
                              setBrokenImages((prev) => ({ ...prev, [slot.key]: true }));
                              showNotification('error', `Atenção: A imagem do campo "${slot.sectionLabel}" não pôde ser carregada. Verifique o URL.`);
                            }}
                            className={`w-full h-full ${
                              currentFit === 'contain' ? 'object-contain' : 'object-cover'
                            } ${
                              currentPos === 'top'
                                ? 'object-top'
                                : currentPos === 'bottom'
                                ? 'object-bottom'
                                : 'object-center'
                            } transition-all duration-300`}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400 min-h-[120px]">
                            {isBroken ? (
                              <>
                                <AlertTriangle className="w-6 h-6 text-rose-500 mb-1" />
                                <span className="text-[11px] font-semibold text-rose-600">
                                  Erro ao carregar imagem
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  Substitua por um ficheiro válido
                                </span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                                <span className="text-[11px] font-medium text-slate-500">
                                  Sem imagem atribuída
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  Clique em "Adicionar imagem"
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        <div className="absolute bottom-1.5 left-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950/70 backdrop-blur-xs text-[9px] text-white font-mono">
                            {currentAspect} · {currentFit}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons: Add / Replace / Remove */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSlotForImage(slot);
                            // Also prepare new image modal in case user wants to type or upload
                            setTargetSlotKeyForNewImage(slot.key);
                            setNewImageSection(slot.sectionLabel);
                            setNewImageAspect(slot.aspectRatio);
                          }}
                          className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{currentImg ? 'Substituir' : 'Adicionar'}</span>
                        </button>

                        {currentImg && (
                          <button
                            onClick={() => handleRemoveImageFromSlot(slot)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Remover fotografia deste campo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Settings: Framing, Aspect Ratio, Position, Alt Text */}
                    <div className="sm:col-span-7 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Proporção */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Proporção
                          </label>
                          <select
                            value={currentAspect}
                            onChange={(e) =>
                              handleSlotFieldChange(slot.key, 'draftAspectRatio', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="16:9">16:9 (Panorâmica)</option>
                            <option value="16:10">16:10 (Ecrã)</option>
                            <option value="4:3">4:3 (Clínica)</option>
                            <option value="1:1">1:1 (Quadrada)</option>
                            <option value="3:2">3:2 (Fotografia)</option>
                            <option value="auto">Auto (Natural)</option>
                          </select>
                        </div>

                        {/* Enquadramento */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Enquadr.
                          </label>
                          <select
                            value={currentFit}
                            onChange={(e) =>
                              handleSlotFieldChange(slot.key, 'draftFit', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="cover">Preencher (Cover)</option>
                            <option value="contain">Conter (Contain)</option>
                          </select>
                        </div>

                        {/* Posição */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Posição
                          </label>
                          <select
                            value={currentPos}
                            onChange={(e) =>
                              handleSlotFieldChange(slot.key, 'draftPosition', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="center">Centro</option>
                            <option value="top">Topo</option>
                            <option value="bottom">Base</option>
                          </select>
                        </div>
                      </div>

                      {/* Texto Alternativo (Alt Text) */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Texto Alternativo (Alt Text Acessível & SEO)
                        </label>
                        <input
                          type="text"
                          value={currentAlt}
                          onChange={(e) =>
                            handleSlotFieldChange(slot.key, 'draftAltText', e.target.value)
                          }
                          placeholder="Descreva o tratamento ou instalação..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                        />
                      </div>

                      {/* Previsualizar no Computador e no Telemóvel */}
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setPreviewModalSlot(slot)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pré-visualizar PC & Telemóvel</span>
                        </button>

                        <span className="text-[10px] font-mono text-slate-400">{slot.key}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 2: CRIAR NOVOS CAMPOS E SECÇÕES */}
      {/* ============================================================== */}
      {activeSubTab === 'seccoes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Novos Campos e Secções Criados Dinamicamente
              </h2>
              <p className="text-xs text-slate-500">
                Crie novos blocos de conteúdo com texto, múltiplas imagens e botões de ação nas páginas pretendidas.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingSection({
                  page: 'home',
                  sectionName: 'Nova Secção',
                  title: '',
                  text: '',
                  images: [],
                  buttonText: 'Saber Mais',
                  buttonLink: 'agendamento',
                  order: customSections.length + 1,
                  status: 'publicado',
                });
                setShowSectionModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Secção</span>
            </button>
          </div>

          {customSections.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Nenhum novo campo ou secção personalizada criada
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Adicione blocos complementares nas páginas de Serviços, Apresentação institucional, Casos ou Masterclasses.
              </p>
              <button
                onClick={() => {
                  setEditingSection({
                    page: 'home',
                    sectionName: 'Tecnologia Clínica de Ponta',
                    title: 'Inovação Odontológica e Protocolos Validados',
                    text: 'Apresentamos soluções de marketing e triagem alinhadas com os mais rigorosos padrões da odontologia moderna.',
                    images: [
                      {
                        url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=85',
                        alt: 'Gabinete odontológico de última geração',
                        aspectRatio: '16:9',
                        fit: 'cover',
                        position: 'center',
                      },
                    ],
                    buttonText: 'Agendar Diagnóstico',
                    buttonLink: 'agendamento',
                    order: 1,
                    status: 'publicado',
                  });
                  setShowSectionModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer"
              >
                Criar Secção de Exemplo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {customSections
                .sort((a, b) => a.order - b.order)
                .map((sec) => (
                  <div
                    key={sec.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase">
                          Página: {sec.page}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-bold text-slate-800">
                          {sec.sectionName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            sec.status === 'publicado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {sec.status === 'publicado' ? 'Publicado' : 'Oculto'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{sec.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl">{sec.text}</p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                        <span>{sec.images.length} imagem(ns) associada(s)</span>
                        <span>·</span>
                        <span>Ordem: #{sec.order}</span>
                        {sec.buttonText && (
                          <>
                            <span>·</span>
                            <span>Botão: "{sec.buttonText}" → {sec.buttonLink}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions: Move Up / Down, Duplicate, Toggle Hide, Edit, Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMoveSection(sec, 'up')}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        title="Subir ordem"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(sec, 'down')}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        title="Descer ordem"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateSection(sec)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        title="Duplicar secção"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleHideSection(sec)}
                        className={`p-2 rounded-lg transition-colors ${
                          sec.status === 'publicado'
                            ? 'text-slate-500 hover:bg-slate-100'
                            : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                        }`}
                        title={sec.status === 'publicado' ? 'Ocultar secção' : 'Publicar secção'}
                      >
                        {sec.status === 'publicado' ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSection(sec);
                          setShowSectionModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Editar secção"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSection(sec)}
                        className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                        title="Eliminar secção"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 3: BIBLIOTECA DE IMAGENS */}
      {/* ============================================================== */}
      {activeSubTab === 'biblioteca' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Biblioteca de Imagens & Mídia
              </h2>
              <p className="text-xs text-slate-500">
                Guarde, organize e associe manualmente fotografias reais a qualquer campo ou secção do site.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedSlotForImage(null);
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Carregar Ficheiro</span>
              </button>

              <button
                onClick={() => {
                  setNewImageTitle('');
                  setNewImageUrl('');
                  setNewImageSection('Hero');
                  setNewImageAspect('16:9');
                  setNewImageOrigin('Instagram @oralpro.italia');
                  setTargetSlotKeyForNewImage('');
                  setShowAddImageModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Nova Imagem</span>
              </button>
            </div>
          </div>

          {/* Filters Bar: Page, Section & Category */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                <span>Filtrar:</span>
              </div>

              {/* Category / Service Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="Implantologia">Implantologia & Reabilitação</option>
                <option value="Ortodontia">Ortodontia & Alinhadores</option>
                <option value="Estética">Estética & Facetas</option>
                <option value="Fundador">Fundador (Mario Provenzano)</option>
                <option value="Eventos">Eventos ao Vivo & Masterclass</option>
                <option value="Instalações">Instalações Clínicas</option>
                <option value="Equipa">Equipa & Triagem</option>
              </select>

              {/* Page Filter */}
              <select
                value={selectedPageFilter}
                onChange={(e) => setSelectedPageFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="todos">Todas as Páginas</option>
                <option value="Página Inicial">Página Inicial</option>
                <option value="Serviços">Serviços</option>
                <option value="Sobre">Sobre a OralPro</option>
                <option value="Galeria">Galeria Oficial</option>
              </select>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              {filteredLibrary.length} fotografia(s) na biblioteca
            </span>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredLibrary.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedLibraryItem(item);
                  setManualSlotAssignTarget('');
                  setManualAssignConfirmed(false);
                }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md hover:border-blue-400 transition-all cursor-pointer"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-[10px] text-white font-semibold">
                        {item.aspectRatio || '16:9'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-600/90 backdrop-blur-md text-[10px] text-white font-semibold">
                        {item.size || 'HD'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      Origem: {item.origin || 'Instagram @oralpro.italia'}
                    </p>

                    {/* Usages badge */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Utilizada em:
                      </span>
                      {item.usedIn && item.usedIn.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.usedIn.map((place, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100 line-clamp-1"
                            >
                              {place}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Ainda não associada a nenhum campo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 mt-2">
                  <span className="text-[10px] font-mono">
                    {new Date(item.createdAt).toLocaleDateString('pt-PT')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLibraryItem(item);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Associar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Pretende eliminar permanentemente "${item.name}" da biblioteca?`)) {
                          deleteMedia(item.id);
                          showNotification('info', 'Fotografia eliminada da biblioteca.');
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Eliminar da biblioteca"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: "Adicionar Nova Imagem" (MATCHING USER SCREENSHOT) */}
      {/* ============================================================== */}
      {showAddImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 font-display">
                Adicionar Nova Imagem
              </h3>
              <button
                type="button"
                onClick={() => setShowAddImageModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddImageModal} className="space-y-4">
              {/* Field 1: Título */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Título
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Instalações Clínicas & Tecnologia"
                  value={newImageTitle}
                  onChange={(e) => setNewImageTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Field 2: URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="https://..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Carregar ficheiro do computador e preencher URL"
                  >
                    Carregar
                  </button>
                </div>
              </div>

              {/* Row 3: Secção & Aspect Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Secção
                  </label>
                  <select
                    value={newImageSection}
                    onChange={(e) => setNewImageSection(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Hero">Hero</option>
                    <option value="Apresentação">Apresentação</option>
                    <option value="Sobre">Sobre a OralPro</option>
                    <option value="Implantologia">Implantologia & Reabilitação</option>
                    <option value="Ortodontia">Ortodontia Invisível</option>
                    <option value="Estética">Estética Dentária</option>
                    <option value="Método">Método OralPro</option>
                    <option value="Eventos">Eventos & Masterclass</option>
                    <option value="Galeria">Galeria Oficial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Aspect Ratio
                  </label>
                  <select
                    value={newImageAspect}
                    onChange={(e) => setNewImageAspect(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="16:9">16:9</option>
                    <option value="16:10">16:10</option>
                    <option value="4:3">4:3</option>
                    <option value="1:1">1:1</option>
                    <option value="3:2">3:2</option>
                  </select>
                </div>
              </div>

              {/* Field 4: Origem */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Origem
                </label>
                <input
                  type="text"
                  value={newImageOrigin}
                  onChange={(e) => setNewImageOrigin(e.target.value)}
                  placeholder="Instagram @oralpro.italia"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Optional: Associate immediately to a specific existing slot */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Associar a um campo do site (Opcional):
                </label>
                <select
                  value={targetSlotKeyForNewImage}
                  onChange={(e) => setTargetSlotKeyForNewImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                >
                  <option value="">Apenas guardar na biblioteca</option>
                  {slots.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.pageLabel} › {s.sectionLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bottom Buttons: Fechar & Confirmar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddImageModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DETALHES DA FOTOGRAFIA & ASSOCIAÇÃO MANUAL A UM CAMPO */}
      {/* ============================================================== */}
      {selectedLibraryItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase">
                  Biblioteca OralPro
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedLibraryItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLibraryItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-res Preview Frame */}
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 max-h-72 flex items-center justify-center">
              <img
                src={selectedLibraryItem.url}
                alt={selectedLibraryItem.name}
                className="max-h-72 w-full object-contain"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Resolução/Tamanho</span>
                <span className="font-bold text-slate-700">{selectedLibraryItem.size || 'HD Otimizado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Proporção</span>
                <span className="font-bold text-slate-700">{selectedLibraryItem.aspectRatio || '16:9'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Categoria</span>
                <span className="font-bold text-slate-700">{selectedLibraryItem.category || 'Geral'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Origem</span>
                <span className="font-bold text-slate-700 truncate block">{selectedLibraryItem.origin || 'Instagram'}</span>
              </div>
            </div>

            {/* Where it is used */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-800">
                Onde já está a ser utilizada:
              </h4>
              {selectedLibraryItem.usedIn && selectedLibraryItem.usedIn.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedLibraryItem.usedIn.map((place, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200/60"
                    >
                      {place}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Esta fotografia ainda não está associada a nenhuma página pública.
                </p>
              )}
            </div>

            {/* Manual Field Assignment Section with Confirmation Checkbox */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  Associar Manualmente a um Campo do Site:
                </h4>
              </div>

              <p className="text-[11px] text-slate-600">
                Selecione o campo onde pretende apresentar esta fotografia. Nenhuma alteração é aplicada sem a sua confirmação explícita.
              </p>

              <select
                value={manualSlotAssignTarget}
                onChange={(e) => setManualSlotAssignTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione a página e o campo pretendido...</option>
                {slots.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.pageLabel} › {s.sectionLabel}
                  </option>
                ))}
              </select>

              {manualSlotAssignTarget && (
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={manualAssignConfirmed}
                      onChange={(e) => setManualAssignConfirmed(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <span>
                      Confirmo manualmente que pretendo associar esta fotografia ao campo selecionado.
                    </span>
                  </label>

                  <button
                    onClick={handleConfirmManualAssociation}
                    disabled={!manualAssignConfirmed || isSubmitting}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                      manualAssignConfirmed
                        ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Associação ao Campo</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLibraryItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ESCOLHER FOTOGRAFIA PARA UM CAMPO EXISTENTE */}
      {/* ============================================================== */}
      {selectedSlotForImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">
                  {selectedSlotForImage.pageLabel}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Definir Imagem para: {selectedSlotForImage.sectionLabel}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSlotForImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Upload Option */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-blue-900">
                  Carregar do Computador (Compressão Automática HD)
                </h4>
                <p className="text-[11px] text-blue-700">
                  Comprime automaticamente para carregamento rápido mantendo a cópia em alta resolução.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-sm"
              >
                Escolher Ficheiro
              </button>
            </div>

            {/* Paste External Image URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Ou introduza o URL direto da imagem:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  id="slot-direct-url-input"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const el = document.getElementById('slot-direct-url-input') as HTMLInputElement;
                    if (el && el.value.trim()) {
                      await updateSlot(selectedSlotForImage.key, { draftImageUrl: el.value.trim() });
                      showNotification('success', 'Imagem associada em rascunho com sucesso!');
                      setSelectedSlotForImage(null);
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Pick from Media Library */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ou selecione a partir da Biblioteca ({mediaLibrary.length} disponíveis):
              </h4>
              <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                {mediaLibrary.map((item) => (
                  <div
                    key={item.id}
                    onClick={async () => {
                      if (
                        confirm(
                          `Pretende associar a imagem "${item.name}" ao campo "${selectedSlotForImage.pageLabel} > ${selectedSlotForImage.sectionLabel}"?`
                        )
                      ) {
                        await updateSlot(selectedSlotForImage.key, { draftImageUrl: item.url });
                        showNotification('success', `Imagem "${item.name}" associada com sucesso!`);
                        setSelectedSlotForImage(null);
                      }
                    }}
                    className="border border-slate-200 rounded-xl overflow-hidden hover:border-blue-600 cursor-pointer group"
                  >
                    <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2 text-[10px] font-semibold text-slate-700 line-clamp-1">
                      {item.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: PRÉ-VISUALIZAÇÃO DE CAMPO INDIVIDUAL (PC / TELEMÓVEL) */}
      {/* ============================================================== */}
      {previewModalSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-white">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase">
                  {previewModalSlot.pageLabel}
                </span>
                <h3 className="text-base font-bold text-white font-display">
                  Pré-visualização: {previewModalSlot.sectionLabel}
                </h3>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Computador</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Telemóvel</span>
                </button>
              </div>

              <button
                onClick={() => setPreviewModalSlot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewport Frame */}
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div
                className={`transition-all duration-300 bg-white rounded-2xl overflow-hidden shadow-2xl text-slate-900 border border-slate-200 ${
                  previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'
                }`}
              >
                {/* Simulated frame title */}
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>OralPro · {previewModalSlot.sectionLabel}</span>
                  <span>{previewDevice === 'mobile' ? '375px (Mobile)' : '100% (Desktop)'}</span>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-blue-600 uppercase">
                      OralPro Clínica Parceira
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">
                      {previewModalSlot.sectionLabel}
                    </h4>
                  </div>

                  {/* Rendered Image */}
                  <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={
                        previewModalSlot.draftImageUrl !== undefined
                          ? previewModalSlot.draftImageUrl
                          : previewModalSlot.imageUrl
                      }
                      alt={
                        previewModalSlot.draftAltText !== undefined
                          ? previewModalSlot.draftAltText
                          : previewModalSlot.altText
                      }
                      className={`w-full ${
                        (previewModalSlot.draftAspectRatio || previewModalSlot.aspectRatio) === '1:1'
                          ? 'aspect-square'
                          : (previewModalSlot.draftAspectRatio || previewModalSlot.aspectRatio) === '4:3'
                          ? 'aspect-[4/3]'
                          : (previewModalSlot.draftAspectRatio || previewModalSlot.aspectRatio) === '16:10'
                          ? 'aspect-[16/10]'
                          : (previewModalSlot.draftAspectRatio || previewModalSlot.aspectRatio) === '3:2'
                          ? 'aspect-[3/2]'
                          : 'aspect-[16/9]'
                      } ${
                        (previewModalSlot.draftFit || previewModalSlot.fit) === 'contain'
                          ? 'object-contain'
                          : 'object-cover'
                      } ${
                        (previewModalSlot.draftPosition || previewModalSlot.position) === 'top'
                          ? 'object-top'
                          : (previewModalSlot.draftPosition || previewModalSlot.position) === 'bottom'
                          ? 'object-bottom'
                          : 'object-center'
                      }`}
                    />
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    Texto alternativo configurado: "
                    {previewModalSlot.draftAltText !== undefined
                      ? previewModalSlot.draftAltText
                      : previewModalSlot.altText}
                    "
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Para aplicar ao público, certifique-se de clicar em "Publicar alterações".</span>
              <button
                onClick={() => setPreviewModalSlot(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: PRÉ-VISUALIZAÇÃO GLOBAL DO SITE (DESKTOP & TELEMÓVEL) */}
      {/* ============================================================== */}
      {showGlobalSitePreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col overflow-hidden text-white shadow-2xl">
            {/* Top Bar with Page Navigator & Device Switcher */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-white font-display">
                  Pré-visualização do Site
                </span>
                {/* Page Tabs */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs">
                  {[
                    { key: 'home', label: 'Início' },
                    { key: 'servicos', label: 'Serviços' },
                    { key: 'metodo', label: 'Método' },
                    { key: 'areas', label: 'Áreas' },
                    { key: 'sobre', label: 'Sobre' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setGlobalPreviewPage(p.key as any)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        globalPreviewPage === p.key
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Device switch */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Computador</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Telemóvel (375px)</span>
                  </button>
                </div>

                <button
                  onClick={async () => {
                    await handlePublishAll();
                    setShowGlobalSitePreview(false);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Publicar Agora
                </button>

                <button
                  onClick={() => setShowGlobalSitePreview(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Frame Viewport */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 flex items-start justify-center">
              <div
                className={`bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border border-slate-300 ${
                  previewDevice === 'mobile' ? 'w-[375px] min-h-[640px]' : 'w-full max-w-5xl'
                }`}
              >
                {/* Simulated Address Bar */}
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-slate-700">oralpro.pt/{globalPreviewPage}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    Rascunho Ativo
                  </span>
                </div>

                {/* Simulated Content Rendering with Draft Slots */}
                <div className="p-6 space-y-8">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      OralPro · Marketing Odontológico
                    </span>
                    <h2 className="text-2xl font-black text-slate-950">
                      Visualização da Página: {globalPreviewPage.toUpperCase()}
                    </h2>
                    <p className="text-xs text-slate-600">
                      As imagens abaixo refletem exatamente as configurações de enquadramento e proporção do rascunho.
                    </p>
                  </div>

                  {/* Render Page Slots */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {slots
                      .filter((s) => s.page === globalPreviewPage || (globalPreviewPage === 'home' && s.page === 'galeria'))
                      .map((s) => {
                        const img = s.draftImageUrl !== undefined ? s.draftImageUrl : s.imageUrl;
                        const aspect = s.draftAspectRatio || s.aspectRatio;
                        const fit = s.draftFit || s.fit;
                        const pos = s.draftPosition || s.position;
                        const alt = s.draftAltText !== undefined ? s.draftAltText : s.altText;

                        return (
                          <div key={s.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span>{s.sectionLabel}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{aspect}</span>
                            </div>

                            {img ? (
                              <div
                                className={`rounded-xl overflow-hidden bg-slate-200 ${
                                  aspect === '1:1'
                                    ? 'aspect-square'
                                    : aspect === '4:3'
                                    ? 'aspect-[4/3]'
                                    : aspect === '16:10'
                                    ? 'aspect-[16/10]'
                                    : 'aspect-[16/9]'
                                }`}
                              >
                                <img
                                  src={img}
                                  alt={alt}
                                  className={`w-full h-full ${
                                    fit === 'contain' ? 'object-contain' : 'object-cover'
                                  } ${
                                    pos === 'top'
                                      ? 'object-top'
                                      : pos === 'bottom'
                                      ? 'object-bottom'
                                      : 'object-center'
                                  }`}
                                />
                              </div>
                            ) : (
                              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                                Sem imagem configurada
                              </div>
                            )}

                            <p className="text-[11px] text-slate-500 italic">"{alt}"</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: CRIAR OU EDITAR SECÇÃO PERSONALIZADA (MULTI-IMAGEM) */}
      {/* ============================================================== */}
      {showSectionModal && editingSection && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSection}
            className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {editingSection.id ? 'Editar Campo / Secção' : 'Criar Novo Campo / Secção'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSectionModal(false);
                  setEditingSection(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Página Destino
                </label>
                <select
                  value={editingSection.page || 'home'}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, page: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="home">Página Inicial</option>
                  <option value="sobre">Sobre a OralPro</option>
                  <option value="servicos">Serviços</option>
                  <option value="metodo">Método OralPro</option>
                  <option value="areas">Áreas Clínicas</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome da Secção
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Destaque Tecnologia"
                  value={editingSection.sectionName || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, sectionName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Título Principal
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Tecnologia de Diagnóstico e Alinhamento"
                value={editingSection.title || ''}
                onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Texto / Descrição
              </label>
              <textarea
                rows={3}
                required
                placeholder="Insira o texto explicativo da secção..."
                value={editingSection.text || ''}
                onChange={(e) => setEditingSection({ ...editingSection, text: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            {/* Multi-image Management inside Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Fotografias da Secção ({editingSection.images?.length || 0})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pode adicionar uma ou mais imagens com enquadramento e texto alternativo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentImgs = editingSection.images || [];
                    setEditingSection({
                      ...editingSection,
                      images: [
                        ...currentImgs,
                        {
                          url: '',
                          alt: editingSection.title || '',
                          aspectRatio: '16:9',
                          fit: 'cover',
                          position: 'center',
                        },
                      ],
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Fotografia</span>
                </button>
              </div>

              {editingSection.images && editingSection.images.length > 0 ? (
                <div className="space-y-3">
                  {editingSection.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Fotografia #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(editingSection.images || [])];
                            updated.splice(idx, 1);
                            setEditingSection({ ...editingSection, images: updated });
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remover esta imagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block mb-0.5">
                            URL da Fotografia
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://..."
                            value={img.url}
                            onChange={(e) => {
                              const updated = [...(editingSection.images || [])];
                              updated[idx].url = e.target.value;
                              setEditingSection({ ...editingSection, images: updated });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block mb-0.5">
                            Texto Alternativo (Alt Text)
                          </label>
                          <input
                            type="text"
                            placeholder="Descrição da fotografia..."
                            value={img.alt}
                            onChange={(e) => {
                              const updated = [...(editingSection.images || [])];
                              updated[idx].alt = e.target.value;
                              setEditingSection({ ...editingSection, images: updated });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block mb-0.5">
                            Proporção
                          </label>
                          <select
                            value={img.aspectRatio}
                            onChange={(e) => {
                              const updated = [...(editingSection.images || [])];
                              updated[idx].aspectRatio = e.target.value as any;
                              setEditingSection({ ...editingSection, images: updated });
                            }}
                            className="w-full px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs"
                          >
                            <option value="16:9">16:9</option>
                            <option value="16:10">16:10</option>
                            <option value="4:3">4:3</option>
                            <option value="1:1">1:1</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block mb-0.5">
                            Enquadr.
                          </label>
                          <select
                            value={img.fit}
                            onChange={(e) => {
                              const updated = [...(editingSection.images || [])];
                              updated[idx].fit = e.target.value as any;
                              setEditingSection({ ...editingSection, images: updated });
                            }}
                            className="w-full px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs"
                          >
                            <option value="cover">Preencher</option>
                            <option value="contain">Conter</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 uppercase block mb-0.5">
                            Posição
                          </label>
                          <select
                            value={img.position}
                            onChange={(e) => {
                              const updated = [...(editingSection.images || [])];
                              updated[idx].position = e.target.value as any;
                              setEditingSection({ ...editingSection, images: updated });
                            }}
                            className="w-full px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs"
                          >
                            <option value="center">Centro</option>
                            <option value="top">Topo</option>
                            <option value="bottom">Base</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Nenhuma imagem adicionada a esta secção (opcional).
                </div>
              )}
            </div>

            {/* Button options */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Texto do Botão (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Agendar Reunião"
                  value={editingSection.buttonText || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, buttonText: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ligação do Botão
                </label>
                <input
                  type="text"
                  placeholder="Ex: agendamento ou https://..."
                  value={editingSection.buttonLink || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, buttonLink: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Order and Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ordem de Apresentação
                </label>
                <input
                  type="number"
                  value={editingSection.order || 1}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, order: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Estado</label>
                <select
                  value={editingSection.status || 'publicado'}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, status: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="publicado">Publicado</option>
                  <option value="oculto">Oculto</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowSectionModal(false);
                  setEditingSection(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
              >
                Guardar Secção
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: CONFIRMAÇÃO DETALHADA ANTES DE ELIMINAR SECÇÃO */}
      {/* ============================================================== */}
      {deleteConfirmSection && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Confirmar Eliminação da Secção
              </h3>
              <p className="text-xs text-slate-500">
                Tem a certeza de que pretende eliminar permanentemente a secção "
                {deleteConfirmSection.sectionName}"?
              </p>
            </div>

            {/* Warning if section is published */}
            {deleteConfirmSection.status === 'publicado' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Aviso: Esta secção encontra-se atualmente PUBLICADA e visível no site!</span>
              </div>
            )}

            {/* Details of associated content and images */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-900">Conteúdos & Mídia Associados:</div>
              <div>• Título: "{deleteConfirmSection.title}"</div>
              <div>• Página do Site: {deleteConfirmSection.page}</div>
              <div>
                • Imagens associadas:{' '}
                {deleteConfirmSection.images.length > 0 ? (
                  <span className="text-rose-600 font-bold">
                    {deleteConfirmSection.images.length} imagem(ns)
                  </span>
                ) : (
                  <span>Nenhuma</span>
                )}
              </div>
              {deleteConfirmSection.buttonText && (
                <div>• Botão de Ação: "{deleteConfirmSection.buttonText}"</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSection(null)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSection}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
