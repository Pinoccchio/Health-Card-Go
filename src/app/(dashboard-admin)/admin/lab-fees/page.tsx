'use client';

/**
 * Laboratory Fees Management Page
 * Super Admin can manage pricing for health card laboratory request forms
 */

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, Button, ConfirmDialog } from '@/components/ui';
import { History, Edit, RefreshCcw } from 'lucide-react';
import { useLabFeesAdmin, useUpdateLabFee, type LabFeeHistoryItem } from '@/lib/hooks/useLabFees';
import { useToast } from '@/lib/contexts/ToastContext';

export default function LabFeesManagementPage() {
  const { success: showSuccess, error: showError } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<'food_handler' | 'non_food' | 'pink' | null>(null);

  // Fetch lab fees with history
  const { data, isLoading, refetch } = useLabFeesAdmin(true);
  const updateMutation = useUpdateLabFee();

  // Edit form state
  const [testFee, setTestFee] = useState(0);
  const [cardFee, setCardFee] = useState(0);
  const [testPackageFee, setTestPackageFee] = useState(0);
  const [stoolExamFee, setStoolExamFee] = useState<number | null>(null);
  const [urinalysisFee, setUrinalysisFee] = useState<number | null>(null);
  const [cbcFee, setCbcFee] = useState<number | null>(null);
  const [smearingFee, setSmearingFee] = useState<number | null>(null);
  const [xrayFee, setXrayFee] = useState<number | null>(null);
  const [changeReason, setChangeReason] = useState('');

  const fees = data?.fees || [];
  const history = data?.history || [];

  const handleEdit = (cardType: 'food_handler' | 'non_food' | 'pink') => {
    const fee = fees.find((f: any) => f.card_type === cardType);
    if (fee) {
      setSelectedCardType(cardType);
      setTestFee(fee.test_fee || 0);
      setCardFee(fee.card_fee);
      setStoolExamFee(fee.stool_exam_fee ?? null);
      setUrinalysisFee(fee.urinalysis_fee ?? null);
      setCbcFee(fee.cbc_fee ?? null);
      setSmearingFee(fee.smearing_fee ?? null);
      setXrayFee(fee.xray_fee ?? null);
      // Calculate combined package fee for Yellow/Green cards
      if (cardType === 'food_handler' || cardType === 'non_food') {
        const packageTotal = (fee.stool_exam_fee || 0) + (fee.urinalysis_fee || 0) + (fee.cbc_fee || 0);
        setTestPackageFee(packageTotal);
      }
      setChangeReason('');
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedCardType) return;

    try {
      await updateMutation.mutateAsync({
        card_type: selectedCardType,
        test_fee: testFee,
        card_fee: cardFee,
        stool_exam_fee: stoolExamFee,
        urinalysis_fee: urinalysisFee,
        cbc_fee: cbcFee,
        smearing_fee: smearingFee,
        xray_fee: xrayFee,
        change_reason: changeReason || undefined,
      });

      showSuccess('Lab fees updated successfully');
      setShowEditModal(false);
      setSelectedCardType(null);
    } catch (error: any) {
      showError(error.message || 'Failed to update lab fees');
    }
  };

  const getCardTypeLabel = (cardType: string) => {
    switch (cardType) {
      case 'food_handler':
        return 'Yellow Card (Food Handler)';
      case 'non_food':
        return 'Green Card (Non-Food Handler)';
      case 'pink':
        return 'Pink Card';
      default:
        return cardType;
    }
  };

  const getCardTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'food_handler':
        return 'bg-yellow-100 text-yellow-800';
      case 'non_food':
        return 'bg-green-100 text-green-800';
      case 'pink':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Laboratory Fees Management"
      pageDescription="Manage pricing for health card laboratory request forms"
    >
      <Container size="full">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Current Pricing</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowHistoryModal(true)}
              variant="outline"
              size="sm"
              icon={History}
            >
              View History
            </Button>
            <Button
              onClick={() => refetch()}
              variant="ghost"
              size="sm"
              icon={RefreshCcw}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Lab Fees Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
            <p className="mt-4 text-gray-600">Loading lab fees...</p>
          </div>
        ) : fees.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No lab fees configured</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Card Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Laboratory Tests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Card Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fees.map((fee: any) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCardTypeColor(fee.card_type)}`}>
                        {getCardTypeLabel(fee.card_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {fee.card_type === 'pink' ? (
                        fee.smearing_fee !== null && fee.smearing_fee !== undefined ?
                          `Smearing: ₱${fee.smearing_fee.toLocaleString()}` : '—'
                      ) : (
                        `Stool, Urinalysis, CBC: ₱${((fee.stool_exam_fee || 0) + (fee.urinalysis_fee || 0) + (fee.cbc_fee || 0)).toLocaleString()}`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{fee.card_fee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ₱{fee.total_fee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(fee.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => handleEdit(fee.card_type)}
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedCardType && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300 z-[1002]"
              onClick={() => {
                setShowEditModal(false);
                setSelectedCardType(null);
              }}
              aria-hidden="true"
            />

            {/* Modal Container */}
            <div className="fixed inset-0 flex items-center justify-center z-[1002] p-4">
              <div
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Edit Lab Fees - {getCardTypeLabel(selectedCardType)}
              </h3>

              <div className="space-y-4">
                {/* Laboratory Test Fees Section */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Laboratory Test Fees</h4>

                  {/* Yellow Card & Green Card: Show combined package */}
                  {(selectedCardType === 'food_handler' || selectedCardType === 'non_food') && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stool Exam, Urinalysis, and CBC (Combined Package) (₱)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={testPackageFee}
                        onChange={(e) => {
                          const packageFee = parseInt(e.target.value) || 0;
                          setTestPackageFee(packageFee);
                          // Distribute the package fee among the three tests
                          const perTest = Math.floor(packageFee / 3);
                          const remainder = packageFee - (perTest * 3);
                          setStoolExamFee(perTest);
                          setUrinalysisFee(perTest);
                          setCbcFee(perTest + remainder); // Add remainder to CBC
                        }}
                        placeholder="e.g., 100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This is a combined package price for all three tests
                      </p>
                    </div>
                  )}

                  {/* Pink Card: Show Smearing only */}
                  {selectedCardType === 'pink' && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Smearing (₱)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={smearingFee ?? ''}
                        onChange={(e) => setSmearingFee(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="e.g., 60"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                      />
                    </div>
                  )}
                </div>

                {/* Card Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Fee (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cardFee}
                    onChange={(e) => setCardFee(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  />
                </div>

                {/* Total Calculation */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">Total:</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₱{(
                      cardFee +
                      ((selectedCardType === 'food_handler' || selectedCardType === 'non_food')
                        ? testPackageFee
                        : (smearingFee || 0))
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tests: ₱{(
                      (selectedCardType === 'food_handler' || selectedCardType === 'non_food')
                        ? testPackageFee
                        : (smearingFee || 0)
                    ).toLocaleString()} + Card: ₱{cardFee.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Change (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g., Price adjustment due to inflation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCardType(null);
                  }}
                  variant="outline"
                  size="sm"
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  variant="primary"
                  size="sm"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
              </div>
            </div>
          </>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300 z-[1002]"
              onClick={() => setShowHistoryModal(false)}
              aria-hidden="true"
            />

            {/* Modal Container */}
            <div className="fixed inset-0 flex items-center justify-center z-[1002] p-4">
              <div
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Price Change History</h3>
                <p className="text-sm text-gray-600 mt-1">Last 100 modifications</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {history.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No history available</p>
                ) : (
                  <div className="space-y-4">
                    {history.map((item: LabFeeHistoryItem) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCardTypeColor(item.card_type)}`}>
                              {getCardTypeLabel(item.card_type)}
                            </span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              item.action === 'created' ? 'bg-green-100 text-green-800' :
                              item.action === 'updated' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.action}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(item.changed_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-600">Test Fee</p>
                            <p className="font-medium">
                              {item.old_test_fee !== null && `₱${item.old_test_fee} → `}
                              ₱{item.new_test_fee}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Card Fee</p>
                            <p className="font-medium">
                              {item.old_card_fee !== null && `₱${item.old_card_fee} → `}
                              ₱{item.new_card_fee}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="font-bold">
                              {item.old_total_fee !== null && `₱${item.old_total_fee} → `}
                              ₱{item.new_total_fee}
                            </p>
                          </div>
                        </div>

                        {item.change_reason && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <p className="text-gray-600 font-medium">Reason:</p>
                            <p className="text-gray-800">{item.change_reason}</p>
                          </div>
                        )}

                        {item.changed_by_profile && (
                          <p className="mt-2 text-xs text-gray-500">
                            Changed by: {item.changed_by_profile.first_name} {item.changed_by_profile.last_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200">
                <Button
                  onClick={() => setShowHistoryModal(false)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
              </div>
            </div>
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
