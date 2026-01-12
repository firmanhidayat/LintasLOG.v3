// components/claims/ClaimListModal.tsx
import { Modal } from "@/components/forms/orders/OrdersCreateForm";
import { ClaimItem, Attachment } from "@/types/claims";
import { formatCurrency } from "@/lib/utils";
import { getStateColor } from "@/components/ui/StateBadge";
// import { IconDownload, IconEye } from "@/components/icons/Icon";

interface ClaimListModalProps {
  open: boolean;
  onClose: () => void;
  claims: ClaimItem[];
  loading?: boolean;
}

export function ClaimListModal({ open, onClose, claims, loading }: ClaimListModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCurrentState = (claim: ClaimItem) => {
    return claim.states.find(state => state.is_current) || claim.states[0];
  };

  const handleViewClaim = (claimId: number) => {
    window.open(`${process.env.NEXT_PUBLIC_URL_BASE ?? ""}/claims/details?id=${claimId}`,"_self");
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    if (attachment?.url) {
      const urlWithToken = attachment.url
      window.open(urlWithToken,"_self");
    }
  };

  const getAttachments = (claim: ClaimItem): Attachment[] => {
    const v = claim.document_attachment?.attachments;
    return Array.isArray(v) ? v : [];
  };

  const hasAttachments = (claim: ClaimItem) => getAttachments(claim).length > 0;
  const getFirstAttachment = (claim: ClaimItem) => getAttachments(claim)[0] ?? null;

  if (loading) {
    return (
      <Modal open={open} onClose={onClose}>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Claims List</h3>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading claims...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Claims List</h3>
          <span className="text-sm text-gray-500">
            Total: {claims.length} claims
          </span>
        </div>

        {claims.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No claims found for this order.
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => {
              const currentState = getCurrentState(claim);
              const stateColor = getStateColor(currentState.key);
              const firstAttachment = getFirstAttachment(claim);
              
              return (
                <div
                  key={claim.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800">{claim.name}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {claim.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${stateColor}`}>
                        {currentState.label}
                      </div>
                      <div className="text-lg font-bold text-primary mt-1">
                        {formatCurrency(claim.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Date:</span>
                      <br />
                      {formatDate(claim.date)}
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span>
                      <br />
                      {claim.customer_partner.name}
                    </div>
                    <div>
                      <span className="font-medium">PO:</span>
                      <br />
                      {claim.purchase_order.name}
                    </div>
                    <div>
                      <span className="font-medium">SO:</span>
                      <br />
                      {claim.transport_order.name}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {firstAttachment && (
                        <button
                          onClick={() => handleDownloadAttachment(firstAttachment)}
                          className="flex items-center text-xs text-gray-600 hover:text-primary transition-colors"
                          title={`Download ${firstAttachment.name}`}
                        >
                          {/* <IconDownload className="w-4 h-4 mr-1" /> */}
                          Download Attachment
                        </button>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewClaim(claim.id)}
                        className="flex items-center text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark transition-colors"
                      >
                        {/* <IconEye className="w-4 h-4 mr-1" /> */}
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}