import { jsPDF } from 'jspdf';
import type { Booking, Invoice, Profile } from './types';

// ---- Fill in your business details here ----
const COMPANY = {
  name: 'GRTV Speed Parcel Service',
  gstin: '29AAAAA0000A1Z5', // TODO: replace with your real GSTIN
  address: 'Chikkamalapura Hub, Karnataka, India',
  stateCode: '29', // Karnataka — used to compare against consignor/consignee state for CGST+SGST vs IGST
};

const GST_RATE = 0.18; // 18% total, split CGST 9% + SGST 9% for intra-state, or IGST 18% inter-state

function money(n: number) {
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateInvoicePDF(invoice: Invoice, booking: Booking | undefined, customer: Profile | null | undefined) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(COMPANY.name, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 16;
  doc.text(COMPANY.address, margin, y);
  y += 13;
  doc.text(`GSTIN: ${COMPANY.gstin}`, margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TAX INVOICE', pageWidth - margin, 50, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Invoice No: INV${invoice.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, 68, { align: 'right' });
  doc.text(`Date: ${new Date(invoice.generated_at).toLocaleDateString('en-IN')}`, pageWidth - margin, 82, { align: 'right' });
  if (booking) doc.text(`Tracking ID: ${booking.tracking_id}`, pageWidth - margin, 96, { align: 'right' });

  y += 30;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Bill-to / consignor-consignee block
  const colWidth = (pageWidth - margin * 2 - 20) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Consignor (Sender)', margin, y);
  doc.text('Consignee (Receiver)', margin + colWidth + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 15;

  const consignorLines = [
    booking?.consignor_name ?? customer?.name ?? '—',
    booking?.consignor_phone ?? '',
    booking?.consignor_gstin ? `GSTIN: ${booking.consignor_gstin}` : '',
    [booking?.consignor_city, booking?.consignor_state, booking?.consignor_pincode].filter(Boolean).join(', '),
  ].filter(Boolean);
  const consigneeLines = [
    booking?.consignee_name ?? '—',
    booking?.consignee_phone ?? '',
    booking?.consignee_gstin ? `GSTIN: ${booking.consignee_gstin}` : '',
    [booking?.consignee_city, booking?.consignee_state, booking?.consignee_pincode].filter(Boolean).join(', '),
  ].filter(Boolean);

  const startY = y;
  consignorLines.forEach((line, i) => doc.text(line, margin, startY + i * 13));
  consigneeLines.forEach((line, i) => doc.text(line, margin + colWidth + 20, startY + i * 13));
  y = startY + Math.max(consignorLines.length, consigneeLines.length) * 13 + 20;

  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Shipment details table
  const rows: [string, string][] = [
    ['Service Type', booking?.service_type === 'ftl' ? 'FTL (Full Truck Load)' : 'LTL (Less than Truck Load)'],
    ['Route', booking ? `${booking.pickup_address} -> ${booking.delivery_address}` : '—'],
    ['Parcels', String(booking?.parcel_count ?? 1)],
    ['Weight', `${booking?.weight_kg ?? 0} kg`],
    ['Goods', booking?.goods_class ?? '—'],
    ['E-Way Bill No.', booking?.eway_bill_number ?? '—'],
  ];

  doc.setFontSize(9);
  rows.forEach(([label, value]) => {
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), margin + 130, y, { maxWidth: pageWidth - margin * 2 - 130 });
  });

  y += 28;

  // GST breakup table
  const taxable = invoice.amount ?? 0;
  const sameState = !!booking?.consignor_state && !!booking?.consignee_state
    && booking.consignor_state.trim().toLowerCase() === booking.consignee_state.trim().toLowerCase();

  const tableRows: [string, string][] = sameState
    ? [
        ['Taxable Value (Freight Charges)', money(taxable)],
        [`CGST @ ${(GST_RATE / 2) * 100}%`, money(taxable * (GST_RATE / 2))],
        [`SGST @ ${(GST_RATE / 2) * 100}%`, money(taxable * (GST_RATE / 2))],
      ]
    : [
        ['Taxable Value (Freight Charges)', money(taxable)],
        [`IGST @ ${GST_RATE * 100}%`, money(taxable * GST_RATE)],
      ];
  const grandTotal = taxable * (1 + GST_RATE);

  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, pageWidth - margin * 2, tableRows.length * 22 + 40, 'F');
  y += 20;
  tableRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(label, margin + 12, y);
    doc.text(value, pageWidth - margin - 12, y, { align: 'right' });
    y += 22;
  });
  doc.setDrawColor(200);
  doc.line(margin + 12, y - 8, pageWidth - margin - 12, y - 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Grand Total', margin + 12, y + 10);
  doc.text(money(grandTotal), pageWidth - margin - 12, y + 10, { align: 'right' });

  y += 50;

  // Payment status
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Payment Status: ${invoice.status.toUpperCase()}`, margin, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('This is a computer-generated invoice and does not require a signature.', margin, doc.internal.pageSize.getHeight() - 30);

  doc.save(`INV-${invoice.id.slice(0, 8).toUpperCase()}-${booking?.tracking_id ?? ''}.pdf`);
}
