import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Lab Fee Interface (matches database structure)
 */
export interface LabFee {
  test_fee: number; // Legacy combined fee (kept for backward compatibility)
  card_fee: number;
  total_fee: number;
  stool_exam_fee?: number | null;
  urinalysis_fee?: number | null;
  cbc_fee?: number | null;
  smearing_fee?: number | null;
  xray_fee?: number | null;
  updated_at?: string;
}

export interface LabFeesData {
  food_handler: LabFee;
  non_food: LabFee;
  pink: LabFee;
}

export interface LabFeeHistoryItem {
  id: string;
  card_type: string;
  old_test_fee: number | null;
  new_test_fee: number | null;
  old_card_fee: number | null;
  new_card_fee: number | null;
  old_total_fee: number | null;
  new_total_fee: number | null;
  old_stool_exam_fee?: number | null;
  new_stool_exam_fee?: number | null;
  old_urinalysis_fee?: number | null;
  new_urinalysis_fee?: number | null;
  old_cbc_fee?: number | null;
  new_cbc_fee?: number | null;
  old_smearing_fee?: number | null;
  new_smearing_fee?: number | null;
  old_xray_fee?: number | null;
  new_xray_fee?: number | null;
  changed_at: string;
  change_reason: string | null;
  action: 'created' | 'updated' | 'deactivated';
  changed_by_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

/**
 * Hook to fetch active lab fees
 * Used by: Patients, PDF generator, booking page
 */
export function useLabFees() {
  return useQuery({
    queryKey: ['lab-fees'],
    queryFn: async (): Promise<LabFeesData> => {
      const response = await fetch('/api/lab-fees');
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch lab fees');
      }

      return json.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes (fees don't change often)
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to fetch all lab fees with history (Super Admin only)
 */
export function useLabFeesAdmin(includeHistory = false) {
  return useQuery({
    queryKey: ['lab-fees-admin', includeHistory],
    queryFn: async () => {
      const url = `/api/admin/lab-fees${includeHistory ? '?include_history=true' : ''}`;
      const response = await fetch(url);
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch lab fees');
      }

      return {
        fees: json.data,
        history: json.history as LabFeeHistoryItem[] | null,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update lab fees (Super Admin only)
 */
export function useUpdateLabFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      card_type: 'food_handler' | 'non_food' | 'pink';
      test_fee?: number; // Legacy combined fee (optional for backward compatibility)
      card_fee: number;
      stool_exam_fee?: number | null;
      urinalysis_fee?: number | null;
      cbc_fee?: number | null;
      smearing_fee?: number | null;
      xray_fee?: number | null;
      change_reason?: string;
    }) => {
      const response = await fetch('/api/admin/lab-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to update lab fee');
      }

      return json.data;
    },
    onSuccess: () => {
      // Invalidate both queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['lab-fees'] });
      queryClient.invalidateQueries({ queryKey: ['lab-fees-admin'] });
    },
  });
}

/**
 * Hook to bulk update all lab fees (Super Admin only)
 */
export function useBulkUpdateLabFees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      fees: Array<{
        card_type: 'food_handler' | 'non_food' | 'pink';
        test_fee: number;
        card_fee: number;
      }>;
      change_reason?: string;
    }) => {
      const response = await fetch('/api/admin/lab-fees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to bulk update lab fees');
      }

      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-fees'] });
      queryClient.invalidateQueries({ queryKey: ['lab-fees-admin'] });
    },
  });
}

/**
 * Helper function to get lab fee for a specific card type
 */
export function getLabFeeByCardType(
  fees: LabFeesData | undefined,
  cardType: 'food_handler' | 'non_food' | 'pink'
): LabFee | null {
  if (!fees) return null;
  return fees[cardType] || null;
}
