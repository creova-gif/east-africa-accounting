import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { FileText, Eye, CheckCircle, XCircle, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Proposal {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  company_size: string;
  industry: string;
  countries: string[];
  needs_offline: boolean;
  modules_needed: string[];
  additional_info: string;
  status: 'pending' | 'approved' | 'rejected' | 'invoiced';
  created_at: string;
  recommendation?: any;
}

export function ProposalManagement() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const authHeaders = (json = false): HeadersInit => {
    const headers: Record<string, string> = {};
    if (json) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('authToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const loadProposals = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Check if backend is available first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(`${API_URL}/api/v1/proposals`, {
        signal: controller.signal,
        headers: authHeaders(),
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setProposals(data);
        // Also save to localStorage for offline access
        localStorage.setItem('proposals', JSON.stringify(data));
      } else {
        // API returned error, use localStorage
        const stored = localStorage.getItem('proposals');
        if (stored) {
          setProposals(JSON.parse(stored));
        }
      }
    } catch (error: any) {
      // Silently fallback to localStorage (backend not running is expected)
      if (error.name !== 'AbortError') {
        console.log('Using offline mode for proposals');
      }
      
      const stored = localStorage.getItem('proposals');
      if (stored) {
        setProposals(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowDetails(true);
  };

  const handleGenerateInvoice = async (proposal: Proposal) => {
    setProcessingId(proposal.id);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // First, generate recommendation if not exists
      if (!proposal.recommendation) {
        const configResponse = await fetch(`${API_URL}/api/v1/sales/configure`, {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({
            company_size: proposal.company_size,
            industry: proposal.industry,
            countries: proposal.countries,
            offline_required: proposal.needs_offline,
            modules_needed: proposal.modules_needed,
          }),
        });

        if (configResponse.ok) {
          const recommendation = await configResponse.json();
          proposal.recommendation = recommendation;
        }
      }

      // Generate invoice
      const invoiceResponse = await fetch(`${API_URL}/api/v1/proposals/${proposal.id}/invoice`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({}),
      });

      if (invoiceResponse.ok) {
        const invoice = await invoiceResponse.json();
        
        // Update proposal status
        const updatedProposals = proposals.map(p =>
          p.id === proposal.id ? { ...p, status: 'invoiced' as const } : p
        );
        setProposals(updatedProposals);
        localStorage.setItem('proposals', JSON.stringify(updatedProposals));

        toast.success('Invoice generated and sent to customer!');
      } else {
        throw new Error('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (proposalId: string) => {
    const updatedProposals = proposals.map(p =>
      p.id === proposalId ? { ...p, status: 'approved' as const } : p
    );
    setProposals(updatedProposals);
    localStorage.setItem('proposals', JSON.stringify(updatedProposals));
    toast.success('Proposal approved!');
  };

  const handleReject = async (proposalId: string) => {
    const updatedProposals = proposals.map(p =>
      p.id === proposalId ? { ...p, status: 'rejected' as const } : p
    );
    setProposals(updatedProposals);
    localStorage.setItem('proposals', JSON.stringify(updatedProposals));
    toast.success('Proposal rejected');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      invoiced: { color: 'bg-blue-100 text-blue-800', label: 'Invoiced' },
    };

    const { color, label } = variants[status] || variants.pending;
    return <Badge className={color}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Proposal Management</h1>
        <p className="text-gray-600">
          Review customer proposals and generate invoices
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Requests</div>
          <div className="text-2xl font-bold">{proposals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {proposals.filter(p => p.status === 'pending').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {proposals.filter(p => p.status === 'approved').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Invoiced</div>
          <div className="text-2xl font-bold text-blue-600">
            {proposals.filter(p => p.status === 'invoiced').length}
          </div>
        </Card>
      </div>

      {/* Proposals Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Countries</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No proposals yet
                </TableCell>
              </TableRow>
            ) : (
              proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">{proposal.company_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{proposal.contact_name}</div>
                      <div className="text-gray-500">{proposal.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{proposal.company_size}</TableCell>
                  <TableCell>{proposal.countries.join(', ')}</TableCell>
                  <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(proposal)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {proposal.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(proposal.id)}
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(proposal.id)}
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}

                      {(proposal.status === 'approved' || proposal.status === 'pending') && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateInvoice(proposal)}
                          disabled={processingId === proposal.id}
                        >
                          {processingId === proposal.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4 mr-1" />
                              Invoice
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposal Details</DialogTitle>
            <DialogDescription>
              Full information about this proposal request
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Company Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Company:</span> {selectedProposal.company_name}
                  </div>
                  <div>
                    <span className="text-gray-600">Contact:</span> {selectedProposal.contact_name}
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span> {selectedProposal.email}
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span> {selectedProposal.phone || 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Business Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Size:</span> {selectedProposal.company_size}
                  </div>
                  <div>
                    <span className="text-gray-600">Industry:</span> {selectedProposal.industry}
                  </div>
                  <div>
                    <span className="text-gray-600">Countries:</span> {selectedProposal.countries.join(', ')}
                  </div>
                  <div>
                    <span className="text-gray-600">Offline:</span> {selectedProposal.needs_offline ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Modules Needed</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProposal.modules_needed.map(module => (
                    <Badge key={module} variant="outline">{module}</Badge>
                  ))}
                </div>
              </div>

              {selectedProposal.additional_info && (
                <div>
                  <h3 className="font-semibold mb-2">Additional Information</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedProposal.additional_info}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedProposal.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        handleApprove(selectedProposal.id);
                        setShowDetails(false);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        handleReject(selectedProposal.id);
                        setShowDetails(false);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => handleGenerateInvoice(selectedProposal)}
                  disabled={processingId === selectedProposal.id}
                  className="flex-1"
                >
                  {processingId === selectedProposal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Generate Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}