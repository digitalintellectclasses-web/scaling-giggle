import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('--- Email API Route Started ---');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { email, clientName, amount, invoiceUrl, type } = body;

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing in environment variables');
      return NextResponse.json({ error: 'API key configuration missing' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'Agency Dashboard <onboarding@resend.dev>',
      to: [email],
      subject: `${type === 'quotation' ? 'New Quotation' : 'Invoice'} from Your Agency`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
          <h1 style="color: #10b981;">Hello ${clientName},</h1>
          <p style="color: #4b5563; line-height: 1.6;">
            A new ${type === 'quotation' ? 'quotation' : 'invoice'} has been generated for you.
          </p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #111827;">Amount: ₹${amount.toLocaleString('en-IN')}</p>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            You can view and download the document using the button below:
          </p>
          <a href="${invoiceUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
            View Document
          </a>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Internal API Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    console.log('--- Email API Route Finished ---');
  }
}
