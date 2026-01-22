'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Outbreak data interface
interface OutbreakData {
  barangay_id?: number;
  barangay_name?: string;
  disease_type: string;
  risk_level: 'critical' | 'high' | 'medium';
  total_cases: number;
  critical_cases?: number;
  severe_cases?: number;
  moderate_cases?: number;
  case_count?: number;
  threshold?: number;
  threshold_description?: string;
  first_case_date?: string;
  latest_case_date?: string;
  days_window?: number;
  custom_disease_name?: string | null;
}

interface OutbreakMetadata {
  total_outbreaks: number;
  critical_outbreaks: number;
  high_risk_outbreaks: number;
  medium_risk_outbreaks: number;
  auto_notify_enabled: boolean;
  checked_at: string;
}

interface OutbreakContextValue {
  outbreaks: OutbreakData[];
  metadata: OutbreakMetadata | null;
  loading: boolean;
  error: string | null;
  refetch: (filters?: { diseaseType?: string; barangayId?: number | null }) => Promise<void>;
}

const OutbreakDataContext = createContext<OutbreakContextValue | undefined>(undefined);

interface OutbreakDataProviderProps {
  children: ReactNode;
  diseaseType?: string;
  barangayId?: number | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function OutbreakDataProvider({
  children,
  diseaseType,
  barangayId,
  autoRefresh = false,
  refreshInterval = 120000, // 2 minutes (matches cache TTL)
}: OutbreakDataProviderProps) {
  const [outbreaks, setOutbreaks] = useState<OutbreakData[]>([]);
  const [metadata, setMetadata] = useState<OutbreakMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const fetchOutbreaks = useCallback(async (filters?: { diseaseType?: string; barangayId?: number | null }) => {
    // Cancel previous request if still pending
    if (abortController) {
      abortController.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    setLoading(true);
    setError(null);

    // Timeout after 30 seconds (temporary - while backend optimizations are deployed)
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('⚠️ Outbreak detection fetch timeout (30s)');
    }, 30000);

    try {
      // Build query parameters
      const params = new URLSearchParams();

      const effectiveDiseaseType = filters?.diseaseType ?? diseaseType;
      const effectiveBarangayId = filters?.barangayId ?? barangayId;

      if (effectiveDiseaseType && effectiveDiseaseType !== 'all') {
        params.append('disease_type', effectiveDiseaseType);
      }
      if (effectiveBarangayId) {
        params.append('barangay_id', effectiveBarangayId.toString());
      }

      console.log('[OutbreakContext] Fetching outbreak data with filters:', {
        diseaseType: effectiveDiseaseType,
        barangayId: effectiveBarangayId,
      });

      const response = await fetch(`/api/diseases/outbreak-detection?${params.toString()}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setOutbreaks(result.data || []);
        setMetadata(result.metadata || null);
        console.log('[OutbreakContext] ✅ Loaded', result.data?.length || 0, 'outbreaks');
      } else {
        throw new Error(result.error || 'Failed to load outbreak data');
      }
    } catch (err) {
      // Don't set error if request was aborted (user navigated away or timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[OutbreakContext] Request aborted');
        setError('Request timed out. Please try again or adjust your filters.');
      } else {
        console.error('[OutbreakContext] Error fetching outbreaks:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }, [diseaseType, barangayId, abortController]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchOutbreaks();

    // Cleanup: abort on unmount or filter change
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [diseaseType, barangayId]); // Only refetch when filters change

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('[OutbreakContext] Auto-refreshing outbreak data');
      fetchOutbreaks();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOutbreaks]);

  const value: OutbreakContextValue = {
    outbreaks,
    metadata,
    loading,
    error,
    refetch: fetchOutbreaks,
  };

  return (
    <OutbreakDataContext.Provider value={value}>
      {children}
    </OutbreakDataContext.Provider>
  );
}

// Custom hook to use outbreak data
export function useOutbreakData() {
  const context = useContext(OutbreakDataContext);

  if (context === undefined) {
    throw new Error('useOutbreakData must be used within OutbreakDataProvider');
  }

  return context;
}
