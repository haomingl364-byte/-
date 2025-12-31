import React, { useState, useMemo, useRef, useEffect } from 'react';
// FIX: Alias the imported `Record` to `BaZiRecord` to avoid conflict with TypeScript's built-in `Record` utility type.
import { Record as BaZiRecord } from '../types';
import { X, Clock, Trash2, Search, Folder, ChevronRight, Download, Upload, MapPin, Edit3, AlertCircle, SortAsc } from 'lucide-react';
import { pinyin } from 'pinyin-pro';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: BaZiRecord[];
  onSelect: (record: BaZiRecord) => void;
  onEdit: (record: BaZiRecord) => void; 
  onDelete: (id: string) => void;
  onImport: () => void;
  onBackup: (e: React.MouseEvent) => void;
  onUpdateGroup?: (oldName: string, newName: string) => void;
  onDeleteGroup?: (groupName: string) => void;
}

const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
    isOpen, onClose, records, onSelect, onEdit, onDelete, onImport, onBackup,
    onUpdateGroup, onDeleteGroup
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('全部');
  const [sortMode, setSortMode] = useState<'time' | 'alpha'>('time');

  // Group Management State
  const [editingGroup, setEditingGroup] = useState<{original: string, current: string} | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggered = useRef(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const alphaRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Reset to time sort every time drawer opens
  useEffect(() => {
      if (isOpen) {
          setSortMode('time');
          setSearchTerm('');
      }
  }, [isOpen]);

  // Compute unique groups from records
  const groups = useMemo(() => {
    const uniqueGroups = new Set(records.map(r => r.group || '默认分组'));
    return ['全部', ...Array.from(uniqueGroups).sort()];
  }, [records]);

  // Main Filtered & Sorted Logic
  const processedData = useMemo(() => {
    // 1. Basic Filtering (Search + Group)
    const baseList = records.filter(rec => {
      const rawTerm = searchTerm.trim().toLowerCase();
      const recGroup = rec.group || '默认分组';
      
      let matchesSearch = true;
      if (rawTerm) {
          const terms = rawTerm.split(/\s+/);
          const chartStr = `${rec.chart.year.stem}${rec.chart.year.branch}${rec.chart.month.stem}${rec.chart.month.branch}${rec.chart.day.stem}${rec.chart.day.branch}${rec.chart.hour.stem}${rec.chart.hour.branch}`;
          const fullSearchText = `${rec.name.toLowerCase()} ${recGroup.toLowerCase()} ${chartStr}`;
          matchesSearch = terms.every(t => fullSearchText.includes(t));
      }

      const matchesGroup = selectedGroup === '全部' || recGroup === selectedGroup;
      return matchesSearch && matchesGroup;
    });

    // 2. Sorting
    if (sortMode === 'time') {
        return baseList.sort((a, b) => b.createdAt - a.createdAt);
    } else {
        // Alphabetical Sorting & Grouping
        const alphaGrouped: { [key: string]: BaZiRecord[] } = {};
        
        baseList.forEach(rec => {
            const firstChar = rec.name.trim().charAt(0);
            let letter = '#';
            if (firstChar) {
                const py = pinyin(firstChar, { pattern: 'initial', toneType: 'none' });
                if (py && /^[a-zA-Z]/.test(py)) {
                    letter = py.toUpperCase();
                }
            }
            if (!alphaGrouped[letter]) alphaGrouped[letter] = [];
            alphaGrouped[letter].push(rec);
        });

        // Sort names within each letter group
        Object.keys(alphaGrouped).forEach(key => {
            alphaGrouped[key].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        });

        return alphaGrouped;
    }
  }, [records, searchTerm, selectedGroup, sortMode]);

  // Handle Index Bar Jumping
  const handleIndexScroll = (letter: string) => {
      if (sortMode !== 'alpha') setSortMode('alpha');
      
      const target = alphaRefs.current[letter];
      if (target) {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
          if (navigator.vibrate) navigator.vibrate(5);
      }
  };

  const onIndexTouchMove = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const letter = target?.getAttribute('data-letter');
      if (letter) {
          handleIndexScroll(letter);
      }
  };

  // Touch Interactions for Group Pills
  const handleTouchStart = (group: string) => {
      if (group === '全部' || group === '默认分组') return;
      isLongPressTriggered.current = false;
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(() => {
          isLongPressTriggered.current = true;
          setEditingGroup({ original: group, current: group });
          if (navigator.vibrate) navigator.vibrate(50);
      }, 600);
  };

  const handleTouchEnd = (group: string) => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (!isLongPressTriggered.current) {
          setSelectedGroup(group);
      }
  };

  const saveGroupEdit = () => {
      if (!editingGroup || !onUpdateGroup) return;
      if (editingGroup.current.trim() && editingGroup.current !== editingGroup.original) {
          onUpdateGroup(editingGroup.original, editingGroup.current.trim());
      }
      setEditingGroup(null);
  };

  const deleteGroupAction = () => {
      if (!editingGroup || !onDeleteGroup) return;
      if (confirm(`确定要删除分组 "${editingGroup.original}" 吗？\n组内案例将移至默认分组。`)) {
          onDeleteGroup(editingGroup.original);
          setEditingGroup(null);
          setSelectedGroup('全部');
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Content */}
      <div className="relative w-[85%] max-w-sm h-full bg-[#fffcf5] shadow-2xl flex flex-col font-sans animate-slideLeft border-l border-[#d6cda4] pt-[env(safe-area-inset-top)]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#d6cda4] flex justify-between items-center bg-[#fff8ea] shrink-0">
          <div className="flex flex-col">
              <h2 className="text-lg font-bold text-[#8B0000] font-serif flex items-center gap-2">
                <Clock size={18} /> 历史档案
              </h2>
              <div className="flex gap-4 mt-1">
                  <button 
                    onClick={() => setSortMode('time')}
                    className={`text-[10px] font-bold pb-0.5 border-b-2 transition-all ${sortMode === 'time' ? 'text-[#8B0000] border-[#8B0000]' : 'text-[#a89f91] border-transparent'}`}
                  >
                    按时间排序
                  </button>
                  <button 
                    onClick={() => setSortMode('alpha')}
                    className={`text-[10px] font-bold pb-0.5 border-b-2 transition-all ${sortMode === 'alpha' ? 'text-[#8B0000] border-[#8B0000]' : 'text-[#a89f91] border-transparent'}`}
                  >
                    按名字排序
                  </button>
              </div>
          </div>
          <button onClick={onClose} className="text-[#8B0000]/50 hover:text-[#8B0000] transition-colors p-1 rounded-full hover:bg-[#8B0000]/10">
            <X size={24} />
          </button>
        </div>

        {/* Search & Filter Area */}
        <div className="p-3 bg-[#fffcf5] border-b border-[#ebe5ce] space-y-3 shrink-0">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a89f91]" size={14} />
                <input 
                    type="text" 
                    placeholder="搜姓名 或八字(如:甲子 丙寅)..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-[#d6cda4] rounded-full py-2 pl-9 pr-4 text-sm text-[#450a0a] focus:border-[#8B0000] outline-none placeholder-[#d6cda4]"
                />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {groups.map(group => (
                    <button
                        key={group}
                        onTouchStart={() => handleTouchStart(group)}
                        onTouchEnd={() => handleTouchEnd(group)}
                        onMouseDown={() => handleTouchStart(group)}
                        onMouseUp={() => handleTouchEnd(group)}
                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border shadow-sm select-none ${
                            selectedGroup === group 
                            ? 'bg-[#8B0000] text-[#fff8ea] border-[#8B0000]' 
                            : 'bg-white text-[#5c4033] border-[#d6cda4]'
                        }`}
                    >
                        {group}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
            
            {/* Records List */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#fdfbf6] overscroll-contain pr-6"
            >
              {sortMode === 'time' ? (
                // Time List
                (processedData as BaZiRecord[]).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-[#a89f91] space-y-2">
                        <Search size={32} opacity={0.2} />
                        <span className="text-xs">暂无匹配记录</span>
                    </div>
                ) : (
                    (processedData as BaZiRecord[]).map(rec => renderRecordCard(rec, onSelect, onEdit, onDelete, onClose))
                )
              ) : (
                // Alphabetical List
                Object.keys(processedData).sort().map(letter => (
                    // FIX: Wrapped ref assignment in braces to return void instead of the result of the assignment, resolving TypeScript error.
                    <div key={letter} ref={el => { alphaRefs.current[letter] = el; }} className="space-y-2">
                        <div className="sticky top-0 z-10 bg-[#fdfbf6]/90 backdrop-blur-sm py-1">
                            <span className="bg-[#8B0000] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{letter}</span>
                        </div>
                        {(processedData as any)[letter].map((rec: BaZiRecord) => renderRecordCard(rec, onSelect, onEdit, onDelete, onClose))}
                    </div>
                ))
              )}
            </div>

            {/* A-Z Index Bar (Sidebar) */}
            <div 
                className="absolute right-0 top-0 bottom-0 w-6 flex flex-col items-center justify-center bg-transparent z-20 select-none"
                onTouchMove={onIndexTouchMove}
            >
                {AZ.map(letter => (
                    <div 
                        key={letter}
                        data-letter={letter}
                        onClick={() => handleIndexScroll(letter)}
                        className="text-[8px] font-bold text-[#8B0000]/60 hover:text-[#8B0000] py-0.5 w-full text-center transition-colors cursor-pointer active:scale-125"
                    >
                        {letter}
                    </div>
                ))}
            </div>

        </div>
        
        {/* Footer Actions */}
        <div className="p-3 border-t border-[#d6cda4] bg-[#fffcf5] flex gap-2 shrink-0">
            <button onClick={onBackup} className="flex-1 flex items-center justify-center gap-1 bg-[#eaddcf] text-[#5c4033] py-2 rounded text-xs font-bold transition-colors">
                <Download size={14} /> 备份数据
            </button>
            <button onClick={onImport} className="flex-1 flex items-center justify-center gap-1 bg-[#8B0000] text-white py-2 rounded text-xs font-bold transition-colors">
                <Upload size={14} /> 恢复数据
            </button>
        </div>

        {/* Stats */}
        <div className="pb-4 pt-1 text-center text-[10px] text-[#a89f91] bg-[#fffcf5] shrink-0">
            共 {records.length} 条档案 · 长按分组编辑
        </div>

        {/* Group Edit Modal */}
        {editingGroup && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-6 animate-fadeIn">
                <div className="bg-white rounded-lg shadow-xl w-full border border-[#d6cda4] overflow-hidden">
                    <div className="bg-[#fff8ea] p-3 border-b border-[#eaddcf] flex justify-between items-center">
                        <h3 className="text-[#8B0000] font-bold text-sm">编辑分组</h3>
                        <button onClick={() => setEditingGroup(null)}><X size={18} className="text-[#a89f91]"/></button>
                    </div>
                    <div className="p-4 space-y-4">
                        <input 
                            value={editingGroup.current}
                            onChange={(e) => setEditingGroup({...editingGroup, current: e.target.value})}
                            className="w-full border-b border-[#d6cda4] text-lg py-1 text-[#450a0a] outline-none"
                            autoFocus
                        />
                        <div className="flex gap-2">
                             <button onClick={deleteGroupAction} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 rounded transition-colors">删除</button>
                             <button onClick={saveGroupEdit} className="flex-[2] py-2 text-xs font-bold text-white bg-[#8B0000] rounded transition-colors">保存</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// Sub-component for record cards to keep main component clean
const renderRecordCard = (
    rec: BaZiRecord, 
    onSelect: any, 
    onEdit: any, 
    onDelete: any,
    onClose: any
) => (
    <div 
        key={rec.id} 
        onClick={() => { onSelect(rec); onClose(); }}
        className="bg-white border border-[#e5e0d0] rounded-lg shadow-sm p-3 active:scale-[0.98] transition-all relative group cursor-pointer hover:shadow-md"
    >
        <div className="flex justify-between items-start mb-2 pr-12">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-[#450a0a]">{rec.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rec.gender === '乾造' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                    {rec.gender}
                </span>
                {(rec.group && rec.group !== '默认分组') && (
                    <span className="text-[10px] text-[#8B0000] bg-[#fff8ea] px-1.5 py-0.5 rounded border border-[#eaddcf] font-bold">
                        {rec.group}
                    </span>
                )}
            </div>
        </div>

        <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit(rec); onClose(); }} className="text-[#a89f91] hover:text-[#8B0000] p-1.5 rounded-full hover:bg-[#eaddcf] transition-colors"><Edit3 size={15} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }} className="text-[#a89f91] hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
        </div>

        <div className="text-xs text-[#5c4033] space-y-0.5 mb-2 font-mono opacity-80">
            <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#d6cda4]"></span>
                {rec.birthDate} {rec.birthTime}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#450a0a] font-serif font-medium mt-1 pl-2 border-l-2 border-[#d6cda4]/50">
                <span>{rec.chart.year.stem}{rec.chart.year.branch}</span>
                <span>{rec.chart.month.stem}{rec.chart.month.branch}</span>
                <span>{rec.chart.day.stem}{rec.chart.day.branch}</span>
                <span>{rec.chart.hour.stem}{rec.chart.hour.branch}</span>
            </div>
        </div>
        <ChevronRight className="absolute right-2 bottom-3 text-[#d6cda4]/50" size={16} />
    </div>
);