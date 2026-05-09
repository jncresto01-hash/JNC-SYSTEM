import jsPDF from 'jspdf';
import { format } from 'date-fns';
import QRCode from 'qrcode';

export async function generateMemberCard(member: {
  name: string;
  memberId: string;
  expiresAt: string;
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54]
  });

  // Background - Brutalist Deep Black
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 85.6, 54, 'F');

  // Decorative Accent
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.rect(0, 0, 2, 54, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LOYAL MEMBER', 8, 12);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('JNC RESTO & POOL EXCLUSIVE', 8, 16);

  // Member ID Badge
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(8, 22, 40, 8, 1, 1, 'F');
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(member.memberId, 12, 27.5);

  // Name Section
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(5);
  doc.text('MEMBER NAME', 8, 38);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const name = member.name.toUpperCase();
  // Simple truncation if name is too long
  const displayName = name.length > 20 ? name.substring(0, 18) + '...' : name;
  doc.text(displayName, 8, 44);

  // Expiry Date
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(5);
  doc.text('VALID UNTIL', 55, 48);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.text(format(new Date(member.expiresAt), 'dd/MM/yyyy'), 55, 51);

  // QR Code Generation
  try {
    const qrDataUrl = await QRCode.toDataURL(member.memberId, {
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // QR Code Container
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(60, 12, 18, 18, 1, 1, 'F');
    doc.addImage(qrDataUrl, 'PNG', 61, 13, 16, 16);
  } catch (err) {
    console.error('QR Generation failed', err);
  }

  // Footer branding
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(4);
  doc.text('DIGITAL LOYALTY CARD SYSTEM', 8, 51);

  doc.save(`JNC_Card_${member.memberId}.pdf`);
}
